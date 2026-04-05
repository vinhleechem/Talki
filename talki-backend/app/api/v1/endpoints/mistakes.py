import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.conversation import UserMistake

# ====== SCHEMAS ======

class UserMistakeOut(BaseModel):
    id: uuid.UUID
    word_or_phrase: str
    mistake_type: Optional[str] = None
    correction: Optional[str] = None
    occurrence_count: int
    last_seen_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ====== ROUTER ======

router = APIRouter(prefix="/mistakes", tags=["mistakes"])

@router.get("", response_model=List[UserMistakeOut])
async def get_my_mistakes(
    type_filter: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all mistakes for the current user.
    Optionally filter by mistake_type (grammar, vocabulary, pronunciation, filler).
    Sorted by occurrence_count descending.
    """
    uid = uuid.UUID(user_id)
    
    query = select(UserMistake).where(UserMistake.user_id == uid)
    
    if type_filter:
        query = query.where(UserMistake.mistake_type == type_filter)
        
    query = query.order_by(UserMistake.occurrence_count.desc(), UserMistake.last_seen_at.desc())
    
    result = await db.execute(query)
    mistakes = result.scalars().all()
    
    return mistakes
