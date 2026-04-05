"""User profile endpoints."""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdate
from app.services.heart_service import get_hearts
from app.services import payment_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, uuid.UUID(user_id))
    await payment_service.sync_user_plan_state(db, user.id)
    await db.flush()
    await db.refresh(user)  # force reload from DB to avoid stale identity-map cache
    hearts = await get_hearts(db, uuid.UUID(user_id))
    user.hearts = hearts
    return user


@router.patch("/me", response_model=UserPublic)
async def update_me(
    body: UserUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, uuid.UUID(user_id))
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    return user
