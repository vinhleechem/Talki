"""Heart (energy) management service."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User


async def consume_heart(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Deduct 1 heart. Returns remaining hearts. Raises if no hearts left."""
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    _regenerate_hearts(user)

    if user.hearts <= 0:
        raise ValueError("No hearts remaining. Please wait or upgrade to Premium.")

    user.hearts -= 1
    return user.hearts


async def get_hearts(db: AsyncSession, user_id: uuid.UUID) -> int:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    _regenerate_hearts(user)
    return user.hearts


def _regenerate_hearts(user: User) -> None:
    """Passive regen: 1 heart per HEART_REGEN_HOURS, up to FREE_HEARTS_PER_DAY."""
    if user.is_premium:
        user.hearts = 999  # unlimited
        return

    max_hearts = settings.FREE_HEARTS_PER_DAY
    if user.hearts >= max_hearts:
        return

    now = datetime.now(timezone.utc)
    last = user.last_heart_refill.replace(tzinfo=timezone.utc)
    hours_elapsed = (now - last).total_seconds() / 3600
    hearts_to_add = int(hours_elapsed // settings.HEART_REGEN_HOURS)

    if hearts_to_add > 0:
        user.hearts = min(user.hearts + hearts_to_add, max_hearts)
        user.last_heart_refill = last + timedelta(
            hours=hearts_to_add * settings.HEART_REGEN_HOURS
        )
