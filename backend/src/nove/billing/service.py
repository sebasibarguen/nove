# ABOUTME: Stripe API calls for Pulse subscription management.
# ABOUTME: Uses httpx directly against the Stripe REST API (no SDK).

import hashlib
import hmac
import time

import httpx
import structlog

from nove.config import settings

logger = structlog.get_logger()

STRIPE_API = "https://api.stripe.com/v1"


def _auth() -> tuple[str, str]:
    return ("Bearer " + settings.stripe_secret_key, "application/x-www-form-urlencoded")


async def create_checkout_session(
    user_id: str,
    user_email: str,
    stripe_customer_id: str | None,
) -> str:
    """Create a Stripe Checkout session for the Pulse monthly subscription.

    Returns the checkout URL. Includes a 7-day free trial.
    """
    base = settings.pulse_base_url
    data: dict[str, str] = {
        "mode": "subscription",
        "line_items[0][price]": settings.stripe_pulse_price_id,
        "line_items[0][quantity]": "1",
        "success_url": f"{base}/upgrade/success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{base}/upgrade",
        "subscription_data[trial_period_days]": "7",
        "metadata[user_id]": user_id,
    }
    if stripe_customer_id:
        data["customer"] = stripe_customer_id
    else:
        data["customer_email"] = user_email

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{STRIPE_API}/checkout/sessions",
            data=data,
            headers={
                "Authorization": f"Bearer {settings.stripe_secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        resp.raise_for_status()
        return resp.json()["url"]


async def create_portal_session(stripe_customer_id: str) -> str:
    """Create a Stripe Billing Portal session. Returns the portal URL."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{STRIPE_API}/billing_portal/sessions",
            data={
                "customer": stripe_customer_id,
                "return_url": settings.pulse_base_url,
            },
            headers={
                "Authorization": f"Bearer {settings.stripe_secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        resp.raise_for_status()
        return resp.json()["url"]


def verify_webhook_signature(payload: bytes, sig_header: str) -> bool:
    """Verify the Stripe-Signature header using HMAC-SHA256.

    Returns False instead of raising so the router can return 400 cleanly.
    """
    secret = settings.stripe_webhook_secret
    if not secret:
        logger.warning("stripe_webhook_secret_not_set")
        return False

    try:
        parts = {k: v for k, v in (p.split("=", 1) for p in sig_header.split(","))}
        timestamp = parts["t"]
        expected = parts["v1"]
    except (KeyError, ValueError):
        return False

    # Reject events older than 5 minutes to prevent replay attacks.
    if abs(time.time() - int(timestamp)) > 300:
        return False

    signed_payload = f"{timestamp}.".encode() + payload
    computed = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, expected)
