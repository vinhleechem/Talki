import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.achievement import Achievement, UserAchievement
from app.models.user import User
from app.models.lesson import UserLessonProgress
from app.schemas.achievement import AchievementOverviewResponse

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("/me", response_model=AchievementOverviewResponse)
async def get_my_achievements(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    
    # Get user with their unlocked achievements
    user_query = await db.execute(
        select(User).options(
            selectinload(User.achievements).selectinload(UserAchievement.achievement)
        ).filter(User.id == uid)
    )
    user = user_query.scalar_one_or_none()
    
    if not user:
        return AchievementOverviewResponse(
            current_streak=0,
            highest_streak=0,
            total_points=0,
            scenes_completed=0,
            unlocked_achievements=[],
            locked_achievements=[]
        )
        
    # Get total scenes completed (UserLessonProgress where completed is true)
    scenes_query = await db.execute(
        select(func.count(UserLessonProgress.id))
        .filter(UserLessonProgress.user_id == uid, UserLessonProgress.completed == True)
    )
    scenes_completed = scenes_query.scalar_one()
    
    # Get all achievements to find which are locked
    all_achievements_query = await db.execute(select(Achievement))
    all_achievements = all_achievements_query.scalars().all()
    
    unlocked_ids = {ua.achievement_id for ua in user.achievements}
    locked_achievements = [a for a in all_achievements if a.id not in unlocked_ids]

    return AchievementOverviewResponse(
        current_streak=user.current_streak,
        highest_streak=user.highest_streak,
        total_points=user.total_points,
        scenes_completed=scenes_completed,
        unlocked_achievements=user.achievements,
        locked_achievements=locked_achievements
    )
