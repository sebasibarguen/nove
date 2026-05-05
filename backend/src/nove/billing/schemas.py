# ABOUTME: Pydantic schemas for billing API request/response validation.
# ABOUTME: Stripe checkout and portal session responses.

from pydantic import BaseModel


class CheckoutSessionResponse(BaseModel):
    url: str


class PortalSessionResponse(BaseModel):
    url: str
