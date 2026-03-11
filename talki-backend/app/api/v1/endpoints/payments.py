"""Payment endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


class CreatePaymentRequest(BaseModel):
    plan: str  # 'monthly' or 'yearly'


class CreatePaymentResponse(BaseModel):
    checkoutUrl: str


@router.post("/create-link", response_model=CreatePaymentResponse)
async def create_payment_link(
    body: CreatePaymentRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        url = await payment_service.create_payment_url(db, uuid.UUID(user_id), body.plan)
        return CreatePaymentResponse(checkoutUrl=url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/webhook")
async def payos_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        body = await request.json()
        result = await payment_service.handle_payos_webhook(db, body)
        return {"success": True, **result}
    except Exception as e:
        # PayOS expects 200 OK even on failure, but we log the issue
        print(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}
