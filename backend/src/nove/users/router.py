# ABOUTME: User API endpoints for profile management.
# ABOUTME: GET/PATCH /users/me and PUT /users/me/health-profile.

from fastapi import APIRouter

from nove.deps import DB, CurrentUser
from nove.users.models import UserHealthProfile
from nove.users.schemas import HealthProfileRead, HealthProfileUpdate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
async def update_me(body: UserUpdate, user: CurrentUser, db: DB) -> UserRead:
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.put("/me/health-profile", response_model=HealthProfileRead)
async def upsert_health_profile(
    body: HealthProfileUpdate, user: CurrentUser, db: DB
) -> HealthProfileRead:
    profile = await db.get(UserHealthProfile, user.id)
    if profile is None:
        profile = UserHealthProfile(user_id=user.id)
        db.add(profile)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return HealthProfileRead.model_validate(profile)
