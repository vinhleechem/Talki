import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import ManualPaymentConfig, PaymentOrder, Subscription
from app.models.user import User

PLAN_PRICES = {
    "monthly": 99000,
    "yearly": 999000
}

PLAN_DURATIONS = {
    "monthly": timedelta(days=30),
    "yearly": timedelta(days=365)
}

def validate_plan(plan: str) -> str:
    """Validate subscription plan name used by payment flows."""
    if plan not in PLAN_PRICES:
        raise ValueError(f"Invalid plan: {plan}")
    return plan


def build_transfer_note(prefix: str, order_id: uuid.UUID) -> str:
    safe_prefix = (prefix or "TALKI").strip().upper()[:20]
    return f"{safe_prefix}-{str(order_id).replace('-', '')[:8]}"


async def get_or_create_manual_config(db: AsyncSession) -> ManualPaymentConfig:
    config = await db.get(ManualPaymentConfig, 1)
    if config:
        return config

    config = ManualPaymentConfig(id=1, transfer_prefix="TALKI")
    db.add(config)
    await db.flush()
    return config


async def create_manual_payment_order(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan: str,
) -> tuple[PaymentOrder, ManualPaymentConfig]:
    plan = validate_plan(plan)
    config = await get_or_create_manual_config(db)

    order = PaymentOrder(
        user_id=user_id,
        plan=plan,
        amount_vnd=PLAN_PRICES[plan],
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
    )
    db.add(order)
    await db.flush()

    order.transfer_note = build_transfer_note(config.transfer_prefix, order.id)
    await db.flush()
    return order, config


async def list_user_payment_orders(db: AsyncSession, user_id: uuid.UUID) -> list[PaymentOrder]:
    result = await db.execute(
        select(PaymentOrder)
        .where(PaymentOrder.user_id == user_id)
        .order_by(PaymentOrder.created_at.desc())
    )
    return result.scalars().all()


async def _apply_paid_order(db: AsyncSession, order: PaymentOrder) -> None:
    duration = PLAN_DURATIONS[order.plan]
    now = datetime.now(timezone.utc)

    existing_sub = await db.execute(
        select(Subscription).where(Subscription.order_id == order.id)
    )
    sub = existing_sub.scalar_one_or_none()

    if sub is None:
        sub = Subscription(
            user_id=order.user_id,
            order_id=order.id,
            plan=order.plan,
            amount_vnd=order.amount_vnd,
            expires_at=now + duration,
        )
        db.add(sub)

    user = await db.get(User, order.user_id)
    if user:
        user.plan = order.plan
        current_expiry = user.plan_expires_at if user.plan_expires_at and user.plan_expires_at > now else now
        user.plan_expires_at = current_expiry + duration
        user.max_energy = 20
        user.energy = 20


async def admin_review_payment_order(
    db: AsyncSession,
    order_id: uuid.UUID,
    reviewer_id: uuid.UUID,
    new_status: str,
    admin_note: str | None = None,
) -> PaymentOrder:
    if new_status not in {"pending", "paid", "failed", "cancelled"}:
        raise ValueError("Invalid payment status")

    order = await db.get(PaymentOrder, order_id)
    if not order:
        raise ValueError("Payment order not found")

    order.status = new_status
    order.admin_note = admin_note
    order.reviewed_at = datetime.now(timezone.utc)
    order.reviewed_by = reviewer_id

    if new_status == "paid":
        if order.paid_at is None:
            order.paid_at = datetime.now(timezone.utc)
        await _apply_paid_order(db, order)
    elif new_status in {"failed", "cancelled", "pending"}:
        order.paid_at = None

    await db.flush()
    return order
