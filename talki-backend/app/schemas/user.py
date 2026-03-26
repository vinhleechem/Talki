import uuid
from datetime import datetime

from pydantic import BaseModel


class UserPublic(BaseModel):
    id: uuid.UUID
    display_name: str
    email: str
    avatar_url: str | None
    hearts: int
    is_premium: bool
    plan: str
    plan_expires_at: datetime | None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
