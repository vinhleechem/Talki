"""Learning path endpoints – levels, chapters, lessons, progress."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.lesson import (
    Boss,
    Chapter,
    Lesson,
    Level,
    UserLessonProgress,
)
from app.schemas.lesson import (
    BossOut,
    ChapterOut,
    LessonOut,
    LevelOut,
    MarkLessonCompleteRequest,
)
from app.services import achievement_service

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/levels", response_model=list[LevelOut])
async def list_levels(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Level).where(Level.is_published == True).order_by(Level.order_index)
    )
    levels = result.scalars().all()

    uid = uuid.UUID(user_id)
    out = []
    for level in levels:
        # Fetch chapters
        ch_result = await db.execute(
            select(Chapter)
            .where(Chapter.level_id == level.id, Chapter.is_published == True)
            .order_by(Chapter.order_index)
        )
        chapters = ch_result.scalars().all()

        chapters_out = []
        for chapter in chapters:
            ls_result = await db.execute(
                select(Lesson)
                .where(Lesson.chapter_id == chapter.id, Lesson.is_published == True)
                .order_by(Lesson.order_index)
            )
            lessons = ls_result.scalars().all()

            # Completed lesson IDs for this user
            done_result = await db.execute(
                select(UserLessonProgress.lesson_id).where(
                    UserLessonProgress.user_id == uid,
                    UserLessonProgress.lesson_id.in_([l.id for l in lessons]),
                )
            )
            done_ids = set(done_result.scalars().all())
            total = len(lessons)
            done = len(done_ids)
            progress_pct = (done / total * 100) if total else 0.0

            chapters_out.append(
                ChapterOut(
                    id=chapter.id,
                    title=chapter.title,
                    order_index=chapter.order_index,
                    lessons=[
                        LessonOut(
                            id=l.id,
                            title=l.title,
                            video_url=l.video_url,
                            duration_seconds=l.duration_seconds,
                            order_index=l.order_index,
                            is_completed=l.id in done_ids,
                        )
                        for l in lessons
                    ],
                    progress_percent=round(progress_pct, 1),
                )
            )

        # Boss unlock check
        boss_result = await db.execute(
            select(Boss).where(Boss.level_id == level.id)
        )
        boss = boss_result.scalar_one_or_none()
        boss_out = None
        if boss:
            # Total lessons across all chapters in this level
            total_lvl_result = await db.execute(
                select(func.count(Lesson.id))
                .join(Chapter, Lesson.chapter_id == Chapter.id)
                .where(Chapter.level_id == level.id, Lesson.is_published == True)
            )
            total_lvl = total_lvl_result.scalar() or 0
            done_lvl_result = await db.execute(
                select(func.count(UserLessonProgress.id))
                .join(Lesson, UserLessonProgress.lesson_id == Lesson.id)
                .join(Chapter, Lesson.chapter_id == Chapter.id)
                .where(
                    Chapter.level_id == level.id,
                    UserLessonProgress.user_id == uid,
                )
            )
            done_lvl = done_lvl_result.scalar() or 0
            pct = (done_lvl / total_lvl * 100) if total_lvl else 0
            is_unlocked = pct >= level.boss_unlock_threshold

            boss_out = BossOut(
                id=boss.id,
                name=boss.name,
                avatar_url=boss.avatar_url,
                max_turns=boss.max_turns,
                is_unlocked=is_unlocked,
            )

        out.append(
            LevelOut(
                id=level.id,
                title=level.title,
                description=level.description,
                order_index=level.order_index,
                boss_unlock_threshold=level.boss_unlock_threshold,
                chapters=chapters_out,
                boss=boss_out,
            )
        )
    return out


@router.post("/lessons/{lesson_id}/complete", status_code=204)
async def mark_lesson_complete(
    lesson_id: uuid.UUID,
    body: MarkLessonCompleteRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    existing = await db.execute(
        select(UserLessonProgress).where(
            UserLessonProgress.user_id == uid,
            UserLessonProgress.lesson_id == lesson_id,
        )
    )
    if existing.scalar_one_or_none() is None:
        progress = UserLessonProgress(
            user_id=uid,
            lesson_id=lesson_id,
            watch_percent=body.watch_percent,
        )
        db.add(progress)
        await db.flush()  # needed before calculating total scenes completed
        await achievement_service.check_and_award_achievements(db, uid)
