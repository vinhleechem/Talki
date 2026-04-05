"""Heart (energy) management service — v2.1 daily reset model."""
import uuid
from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import EnergyLog, User
from app.services.payment_service import get_or_create_manual_config


async def consume_energy(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: int = 1,
    reason: str = "lesson_action",
    reference_id: uuid.UUID | None = None,
) -> int:
    """
    Deduct `amount` energy from user. Returns remaining energy.
    Raises ValueError if not enough energy.
    Also performs daily reset before checking.
    """
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    await _daily_reset_if_needed(db, user)

    if user.energy < amount:
        raise ValueError(
            f"Không đủ năng lượng. Cần {amount} NL nhưng chỉ còn {user.energy} NL."
        )

    user.energy -= amount
    db.add(
        EnergyLog(
            user_id=user_id,
            delta=-amount,
            reason=reason,
            reference_id=reference_id,
            energy_after=user.energy,
        )
    )
    return user.energy


# Legacy alias for backwards compatibility
async def consume_heart(
    db: AsyncSession,
    user_id: uuid.UUID,
    reason: str = "lesson_action",
    reference_id: uuid.UUID | None = None,
) -> int:
    return await consume_energy(db, user_id, amount=1, reason=reason, reference_id=reference_id)


async def get_hearts(db: AsyncSession, user_id: uuid.UUID) -> int:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    await _daily_reset_if_needed(db, user)
    return user.energy


async def _daily_reset_if_needed(db: AsyncSession, user: User) -> None:
    """
    Daily energy reset logic (v2.1):
    - If plan expired and today > expiry date → downgrade to free first
    - Reset happens once per day when energy < max_energy
    - If energy >= max_energy (e.g., from rescue boost) → keep as is
    - Rescue energy above max drains naturally; next-day reset only brings up to max
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    # Check plan expiry — but only fully revert NEXT day after expiry to be fair
    if user.plan == "monthly" and user.plan_expires_at:
        expiry_date = user.plan_expires_at.date() if user.plan_expires_at.tzinfo else user.plan_expires_at.date()
        if today > expiry_date:
            # Plan has expired; downgrade to free
            config = await get_or_create_manual_config(db)
            user.plan = "free"
            user.plan_expires_at = None
            user.max_energy = config.free_max_energy

    # Determine last reset date
    last_refill = user.last_energy_refill
    if last_refill and last_refill.tzinfo is None:
        last_refill = last_refill.replace(tzinfo=timezone.utc)
    last_date = last_refill.date() if last_refill else date.min

    # Only reset once per day
    if today <= last_date:
        return

    # Reset: only fill up if energy < max_energy
    # (rescue energy above max is preserved until it drains below max)
    if user.energy < user.max_energy:
        gain = user.max_energy - user.energy
        user.energy = user.max_energy
        db.add(
            EnergyLog(
                user_id=user.id,
                delta=gain,
                reason="daily_reset",
                energy_after=user.energy,
            )
        )

    user.last_energy_refill = now
