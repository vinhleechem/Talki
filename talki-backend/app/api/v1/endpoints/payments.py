"""Payment endpoints."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


class CreatePaymentRequest(BaseModel):
    plan: str  # 'monthly' or 'yearly'


class ManualPaymentConfigOut(BaseModel):
    qr_image_url: str | None
    bank_name: str | None
    account_number: str | None
    account_name: str | None
    transfer_prefix: str
    instructions: str | None
    monthly_price: int
    yearly_price: int


class ManualPaymentOrderOut(BaseModel):
    id: uuid.UUID
    plan: str
    amount_vnd: int
    status: str
    transfer_note: str | None
    expires_at: datetime
    created_at: datetime
    paid_at: datetime | None

    # Inline instructions to simplify FE integration for now
    qr_image_url: str | None
    bank_name: str | None
    account_number: str | None
    account_name: str | None
    instructions: str | None


class CreatePaymentResponse(BaseModel):
    checkoutUrl: str
    orderId: uuid.UUID
    transferNote: str | None


@router.post("/create-link", response_model=CreatePaymentResponse)
async def create_payment_link(
    body: CreatePaymentRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        order, config = await payment_service.create_manual_payment_order(
            db,
            uuid.UUID(user_id),
            body.plan,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CreatePaymentResponse(
        checkoutUrl=config.qr_image_url or "",
        orderId=order.id,
        transferNote=order.transfer_note,
    )


@router.get("/config", response_model=ManualPaymentConfigOut)
async def get_manual_payment_config(
    _user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    config = await payment_service.get_or_create_manual_config(db)
    return ManualPaymentConfigOut(
        qr_image_url=config.qr_image_url,
        bank_name=config.bank_name,
        account_number=config.account_number,
        account_name=config.account_name,
        transfer_prefix=config.transfer_prefix,
        instructions=config.instructions,
        monthly_price=config.monthly_price,
        yearly_price=config.yearly_price,
    )


@router.post("/orders", response_model=ManualPaymentOrderOut, status_code=201)
async def create_manual_payment_order(
    body: CreatePaymentRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        order, config = await payment_service.create_manual_payment_order(
            db,
            uuid.UUID(user_id),
            body.plan,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ManualPaymentOrderOut(
        id=order.id,
        plan=order.plan,
        amount_vnd=order.amount_vnd,
        status=order.status,
        transfer_note=order.transfer_note,
        expires_at=order.expires_at,
        created_at=order.created_at,
        paid_at=order.paid_at,
        qr_image_url=config.qr_image_url,
        bank_name=config.bank_name,
        account_number=config.account_number,
        account_name=config.account_name,
        instructions=config.instructions,
    )


@router.post("/orders/{order_id}/confirm", response_model=ManualPaymentOrderOut)
async def confirm_manual_payment_order(
    order_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        order = await payment_service.confirm_manual_payment_order(
            db,
            uuid.UUID(user_id),
            order_id,
        )
    except ValueError as e:
        detail = str(e)
        status_code = 404 if detail == "Payment order not found" else 400
        raise HTTPException(status_code=status_code, detail=detail)

    config = await payment_service.get_or_create_manual_config(db)
    return ManualPaymentOrderOut(
        id=order.id,
        plan=order.plan,
        amount_vnd=order.amount_vnd,
        status=order.status,
        transfer_note=order.transfer_note,
        expires_at=order.expires_at,
        created_at=order.created_at,
        paid_at=order.paid_at,
        qr_image_url=config.qr_image_url,
        bank_name=config.bank_name,
        account_number=config.account_number,
        account_name=config.account_name,
        instructions=config.instructions,
    )


@router.get("/my-orders", response_model=list[ManualPaymentOrderOut])
async def list_my_orders(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    orders = await payment_service.list_user_payment_orders(db, uuid.UUID(user_id))
    config = await payment_service.get_or_create_manual_config(db)
    return [
        ManualPaymentOrderOut(
            id=order.id,
            plan=order.plan,
            amount_vnd=order.amount_vnd,
            status=order.status,
            transfer_note=order.transfer_note,
            expires_at=order.expires_at,
            created_at=order.created_at,
            paid_at=order.paid_at,
            qr_image_url=config.qr_image_url,
            bank_name=config.bank_name,
            account_number=config.account_number,
            account_name=config.account_name,
            instructions=config.instructions,
        )
        for order in orders
    ]
