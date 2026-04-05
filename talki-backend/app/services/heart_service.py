"""Heart (energy) management service."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import EnergyLog, User


async def consume_heart(
    db: AsyncSession,
    user_id: uuid.UUID,
    reason: str = "lesson_action",
    reference_id: uuid.UUID | None = None,
) -> int:
    """Deduct 1 energy point. Returns remaining energy. Raises if no energy left."""
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    _regenerate_hearts(user)

    if user.energy <= 0:
        raise ValueError("No energy remaining. Please wait or upgrade to Premium.")

    user.energy -= 1
    db.add(
        EnergyLog(
            user_id=user_id,
            delta=-1,
            reason=reason,
            reference_id=reference_id,
            energy_after=user.energy,
        )
    )
    return user.energy


async def get_hearts(db: AsyncSession, user_id: uuid.UUID) -> int:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    _regenerate_hearts(user)
    return user.energy


def _regenerate_hearts(user: User) -> None:
    """Passive regen: 1 energy per HEART_REGEN_HOURS, up to max_energy."""
    
    # Check if plan is active
    is_premium = user.plan in ["monthly", "yearly"]
    if is_premium and user.plan_expires_at:
        if datetime.now(timezone.utc) <= user.plan_expires_at:
            # They have an active premium plan; ensure max_energy is at least 20
            # Wait, V2.1 spec says Premium has a certain max_energy, not unlimited. 
            # Or unlimited, but the schema uses energy and max_energy.
            # E.g. 20. But some specs say 999 for premium. We'll use max_energy as the cap.
            pass
        else:
            # Plan expired
            user.plan = "free"
            user.max_energy = settings.FREE_HEARTS_PER_DAY

    # Max capacity varies by plan
    max_cap = user.max_energy if getattr(user, "max_energy", None) else settings.FREE_HEARTS_PER_DAY

    if user.energy >= max_cap:
        return

    now = datetime.now(timezone.utc)
    # Ensure timezone info
    last = user.last_energy_refill.replace(tzinfo=timezone.utc) if user.last_energy_refill else now
    
    hours_elapsed = (now - last).total_seconds() / 3600
    hearts_to_add = int(hours_elapsed // settings.HEART_REGEN_HOURS)

    if hearts_to_add > 0:
        user.energy = min(user.energy + hearts_to_add, max_cap)
        user.last_energy_refill = last + timedelta(
            hours=hearts_to_add * settings.HEART_REGEN_HOURS
        )
