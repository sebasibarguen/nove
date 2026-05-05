# ABOUTME: FastAPI dependency injection for common dependencies.
# ABOUTME: Provides DB session, current authenticated user, etc.

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nove.auth.service import verify_access_token
from nove.database import get_db
from nove.users.models import User

_ACTIVE_SUBSCRIPTION_STATUSES = {"active", "trialing"}

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    payload = verify_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


async def get_pulse_user(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.subscription_status not in _ACTIVE_SUBSCRIPTION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pulse subscription required",
        )
    return user


PulseUser = Annotated[User, Depends(get_pulse_user)]
