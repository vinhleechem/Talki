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
    # Load server-side defaults (e.g., updated_at) in async context to avoid lazy-load later.
    await db.refresh(config)
    return config


async def create_manual_payment_order(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan: str,
) -> tuple[PaymentOrder, ManualPaymentConfig]:
    plan = validate_plan(plan)
    config = await get_or_create_manual_config(db)
    now = datetime.now(timezone.utc)

    existing_in_progress_result = await db.execute(
        select(PaymentOrder)
        .where(
            PaymentOrder.user_id == user_id,
            PaymentOrder.status.in_(["created", "pending"]),
            PaymentOrder.expires_at > now,
        )
        .order_by(PaymentOrder.created_at.desc())
        .limit(1)
    )
    existing_in_progress = existing_in_progress_result.scalar_one_or_none()

    # Idempotent behavior: only one active in-progress order per user at a time.
    if existing_in_progress is not None:
        existing_in_progress.plan = plan
        existing_in_progress.amount_vnd = PLAN_PRICES[plan]
        existing_in_progress.expires_at = now + timedelta(days=2)
        if not existing_in_progress.transfer_note:
            existing_in_progress.transfer_note = build_transfer_note(config.transfer_prefix, existing_in_progress.id)
        await db.flush()
        return existing_in_progress, config

    order = PaymentOrder(
        user_id=user_id,
        plan=plan,
        amount_vnd=PLAN_PRICES[plan],
        status="created",
        expires_at=now + timedelta(days=2),
    )
    db.add(order)
    await db.flush()

    order.transfer_note = build_transfer_note(config.transfer_prefix, order.id)
    await db.flush()
    return order, config


async def confirm_manual_payment_order(
    db: AsyncSession,
    user_id: uuid.UUID,
    order_id: uuid.UUID,
) -> PaymentOrder:
    now = datetime.now(timezone.utc)
    order = await db.get(PaymentOrder, order_id)
    if not order or order.user_id != user_id:
        raise ValueError("Payment order not found")

    if order.expires_at <= now:
        raise ValueError("Payment order has expired")

    if order.status == "created":
        order.status = "pending"
        order.reviewed_at = None
        order.reviewed_by = None
        order.admin_note = None
        await db.flush()
        return order

    if order.status == "pending":
        return order

    raise ValueError("Only newly created orders can be confirmed")


async def list_user_payment_orders(db: AsyncSession, user_id: uuid.UUID) -> list[PaymentOrder]:
    result = await db.execute(
        select(PaymentOrder)
        .where(PaymentOrder.user_id == user_id)
        .order_by(PaymentOrder.created_at.desc())
    )
    return result.scalars().all()


async def sync_user_plan_state(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Recompute user plan from active subscriptions, including expiry fallback to free."""
    now = datetime.now(timezone.utc)
    user = await db.get(User, user_id)
    if not user:
        return

    active_subs_result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.expires_at > now,
        )
        .order_by(Subscription.expires_at.desc())
    )
    active_subs = active_subs_result.scalars().all()

    if not active_subs:
        user.plan = "free"
        user.plan_expires_at = None
        user.max_energy = 3
        if user.energy > 3:
            user.energy = 3
        return

    latest = active_subs[0]
    user.plan = latest.plan
    user.plan_expires_at = latest.expires_at
    user.max_energy = 20
    if user.energy > 20:
        user.energy = 20


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

    previous_status = order.status

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
        if previous_status == "paid":
            existing_sub_result = await db.execute(
                select(Subscription).where(Subscription.order_id == order.id)
            )
            existing_sub = existing_sub_result.scalar_one_or_none()
            if existing_sub is not None:
                await db.delete(existing_sub)
        await sync_user_plan_state(db, order.user_id)

    await db.flush()
    return order
