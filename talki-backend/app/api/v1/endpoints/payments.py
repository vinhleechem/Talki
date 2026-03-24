"""Payment endpoints."""
from fastapi import APIRouter, Depends, HTTPException
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
    _user_id: str = Depends(get_current_user_id),
    _db: AsyncSession = Depends(get_db),
):
    # Automatic provider-based flow was removed. This endpoint will be replaced by manual payment flow.
    try:
        payment_service.validate_plan(body.plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    raise HTTPException(
        status_code=410,
        detail="Automatic payment link flow has been removed. Manual payment flow is not implemented yet.",
    )
