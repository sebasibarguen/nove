# ABOUTME: FastAPI router for Stripe billing — Pulse subscription management.
# ABOUTME: Checkout session creation, billing portal, and Stripe webhook handler.

from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from nove.billing.schemas import CheckoutSessionResponse, PortalSessionResponse
from nove.billing.service import (
    create_checkout_session,
    create_portal_session,
    verify_webhook_signature,
)
from nove.deps import DB, CurrentUser
from nove.users.models import User

logger = structlog.get_logger()

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def start_checkout(user: CurrentUser) -> CheckoutSessionResponse:
    """Create a Stripe Checkout session for the Pulse subscription.

    Returns a URL the frontend should redirect the user to.
    """
    try:
        url = await create_checkout_session(
            user_id=str(user.id),
            user_email=user.email,
            stripe_customer_id=user.stripe_customer_id,
        )
    except Exception:
        logger.exception("stripe_checkout_failed", user_id=str(user.id))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create checkout session")

    return CheckoutSessionResponse(url=url)


@router.post("/portal", response_model=PortalSessionResponse)
async def open_portal(user: CurrentUser) -> PortalSessionResponse:
    """Create a Stripe Billing Portal session for subscription management."""
    if not user.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No billing account found")

    try:
        url = await create_portal_session(user.stripe_customer_id)
    except Exception:
        logger.exception("stripe_portal_failed", user_id=str(user.id))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create portal session")

    return PortalSessionResponse(url=url)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: DB) -> dict[str, str]:
    """Receive and process Stripe webhook events.

    Stripe sends events for subscription lifecycle changes. We update the
    user's subscription_status to gate access to Pulse routes.
    """
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if not verify_webhook_signature(payload, sig):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    event = await request.json()
    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)
    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        await _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)
    else:
        logger.debug("stripe_webhook_ignored", event_type=event_type)

    return {"status": "ok"}


async def _handle_checkout_completed(db: DB, session: dict) -> None:
    user_id = session.get("metadata", {}).get("user_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not user_id:
        logger.warning("checkout_completed_missing_user_id")
        return

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("checkout_completed_user_not_found", user_id=user_id)
        return

    user.stripe_customer_id = customer_id
    user.stripe_subscription_id = subscription_id
    # Status will be refined by the subscription.updated event that follows.
    # Set trialing as a safe default until then.
    if not user.subscription_status:
        user.subscription_status = "trialing"
    await db.commit()
    logger.info("checkout_completed", user_id=user_id, subscription_id=subscription_id)


async def _handle_subscription_updated(db: DB, subscription: dict) -> None:
    customer_id = subscription.get("customer")
    new_status = subscription.get("status")
    trial_end_ts = subscription.get("trial_end")

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("subscription_updated_user_not_found", customer_id=customer_id)
        return

    user.subscription_status = new_status
    user.trial_ends_at = datetime.fromtimestamp(trial_end_ts, tz=UTC) if trial_end_ts else None
    await db.commit()
    logger.info("subscription_updated", customer_id=customer_id, status=new_status)


async def _handle_subscription_deleted(db: DB, subscription: dict) -> None:
    customer_id = subscription.get("customer")

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    user.subscription_status = "canceled"
    await db.commit()
    logger.info("subscription_canceled", customer_id=customer_id)
