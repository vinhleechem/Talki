import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.achievement import Achievement, UserAchievement
from app.models.lesson import UserLessonProgress

async def check_and_award_achievements(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    """
    Evaluate user stats and award new achievements if conditions are met.
    Returns a list of newly unlocked achievement names (for UI notifications).
    """
    # 1. Fetch user stats
    user = await db.get(User, user_id)
    if not user:
        return []
        
    # 2. Re-calculate actual scenes completed
    scenes_query = await db.execute(
        select(UserLessonProgress).filter(
            UserLessonProgress.user_id == user_id, 
            UserLessonProgress.completed == True
        )
    )
    completed_progress = scenes_query.scalars().all()
    scenes_completed_count = len(completed_progress)
    
    # Calculate total stars across all completed lessons (if tracking total stars is needed)
    total_stars = sum(p.stars for p in completed_progress if p.stars)
    
    # 3. Get all achievements and what the user already has
    all_achvs_query = await db.execute(select(Achievement))
    all_achvs = all_achvs_query.scalars().all()
    
    user_achvs_query = await db.execute(
        select(UserAchievement).filter(UserAchievement.user_id == user_id)
    )
    user_achvs = user_achvs_query.scalars().all()
    unlocked_ids = {ua.achievement_id for ua in user_achvs}
    
    newly_unlocked = []
    
    for achv in all_achvs:
        if achv.id in unlocked_ids:
            continue # Already has this
            
        met_condition = False
        
        # Evaluate condition
        if achv.condition_type == "streak":
            if user.highest_streak >= achv.condition_value:
                met_condition = True
        elif achv.condition_type == "scenes_completed":
            if scenes_completed_count >= achv.condition_value:
                met_condition = True
        elif achv.condition_type == "total_stars":
            if total_stars >= achv.condition_value:
                met_condition = True
                
        # Award it
        if met_condition:
            new_ua = UserAchievement(
                user_id=user_id,
                achievement_id=achv.id,
                unlocked_at=datetime.now(timezone.utc)
            )
            db.add(new_ua)
            newly_unlocked.append(achv.name)
            
    if newly_unlocked:
        # Commit additions
        # Assuming caller manages the commit or we do it here
        # It's safer to just add and let caller flush/commit to keep transaction scope clean
        await db.flush()
        
    return newly_unlocked
