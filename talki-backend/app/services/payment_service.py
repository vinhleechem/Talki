import uuid
import hmac
import hashlib
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from payos import PayOS
from payos.type import PaymentData, ItemData


from app.core.config import settings
from app.models.payment import PaymentOrder, Subscription
from app.models.user import User

if not getattr(settings, "PAYOS_CLIENT_ID", None):
    # If settings don't have payos yet, just allow it to fail or skip
    pass

payos_client = None
if hasattr(settings, "PAYOS_CLIENT_ID") and settings.PAYOS_CLIENT_ID:
    payos_client = PayOS(
        client_id=settings.PAYOS_CLIENT_ID,
        api_key=settings.PAYOS_API_KEY,
        checksum_key=settings.PAYOS_CHECKSUM_KEY,
    )

PLAN_PRICES = {
    "monthly": 99000,
    "yearly": 999000
}

PLAN_DURATIONS = {
    "monthly": timedelta(days=30),
    "yearly": timedelta(days=365)
}

async def create_payment_url(db: AsyncSession, user_id: uuid.UUID, plan: str) -> str:
    """Create a PayOS payment link for the given user and plan."""
    if not payos_client:
        raise ValueError("PayOS is not configured")
        
    if plan not in PLAN_PRICES:
        raise ValueError(f"Invalid plan: {plan}")

    amount = PLAN_PRICES[plan]
    
    # Generate a unique integer order code for PayOS (max 53 bit integer, using timestamp)
    order_code = int(datetime.now().timestamp() * 1000)
    
    # Pre-create payment order in DB
    order = PaymentOrder(
        user_id=user_id,
        plan=plan,
        amount_vnd=amount,
        status="pending",
        payos_order_id=str(order_code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)
    )
    db.add(order)
    await db.flush()

    # Create PaymentData for PayOS
    item = ItemData(name=f"Talki Premium - {plan.capitalize()} Plan", quantity=1, price=amount)
    
    # For local testing, domain might be localhost
    domain = settings.FRONTEND_URL if hasattr(settings, "FRONTEND_URL") else "http://localhost:5173"
    
    payment_data = PaymentData(
        orderCode=order_code,
        amount=amount,
        description=f"Talki {plan}",
        items=[item],
        cancelUrl=f"{domain}/payment?status=cancel",
        returnUrl=f"{domain}/payment?status=success",
    )

    payos_payment = payos_client.createPaymentLink(paymentData=payment_data)
    
    order.payos_link = payos_payment.checkoutUrl
    
    return payos_payment.checkoutUrl

async def handle_payos_webhook(db: AsyncSession, webhook_body: dict) -> dict:
    """Handle PayOS webhook to confirm payment success."""
    if not payos_client:
        raise ValueError("PayOS is not configured")
        
    # Verify webhook data using payos_client
    webhook_data = payos_client.verifyPaymentWebhookData(webhook_body)
    
    order_code = str(webhook_data.orderCode)
    
    # Find the order
    result = await db.execute(
        select(PaymentOrder).where(PaymentOrder.payos_order_id == order_code)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise ValueError(f"Order not found: {order_code}")
        
    if order.status == "paid":
        return {"message": "Order already processed"}
        
    if webhook_data.code == "00":  # Success usually represented by 00
        order.status = "paid"
        order.paid_at = datetime.now(timezone.utc)
        
        # Create Subscription
        duration = PLAN_DURATIONS[order.plan]
        
        sub = Subscription(
            user_id=order.user_id,
            order_id=order.id,
            plan=order.plan,
            amount_vnd=order.amount_vnd,
            expires_at=datetime.now(timezone.utc) + duration
        )
        db.add(sub)
        
        # Update User
        user = await db.get(User, order.user_id)
        if user:
            user.plan = order.plan
            # Extend plan expiration
            current_expiry = user.plan_expires_at or datetime.now(timezone.utc)
            if current_expiry < datetime.now(timezone.utc):
                current_expiry = datetime.now(timezone.utc)
            user.plan_expires_at = current_expiry + duration
            
            # Subscriptions grant max energy boost (e.g., 20)
            user.max_energy = 20
            user.energy = 20 # Full refill on purchase
            
    else:
        order.status = "failed"

    return {"message": "Webhook processed successfully"}
