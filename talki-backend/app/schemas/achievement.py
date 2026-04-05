import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class AchievementBase(BaseModel):
    code: str
    name: str
    description: str
    icon_url: Optional[str] = None
    condition_type: str
    condition_value: int


class AchievementOut(AchievementBase):
    id: uuid.UUID
    
    model_config = ConfigDict(from_attributes=True)


class UserAchievementOut(BaseModel):
    id: uuid.UUID
    achievement_id: uuid.UUID
    unlocked_at: datetime
    achievement: AchievementOut
    
    model_config = ConfigDict(from_attributes=True)


class AchievementOverviewResponse(BaseModel):
    """Combined response for the achievements page profile."""
    current_streak: int
    highest_streak: int
    total_points: int
    scenes_completed: int  # Derived from DB logic later, but part of UI
    unlocked_achievements: List[UserAchievementOut]
    locked_achievements: List[AchievementOut]
