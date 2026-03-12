"""Learning path endpoints – chapters, lessons, progress (V2.1: no separate levels table)."""
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
    LessonAttemptFeedback,
    UserLessonProgress,
)
from app.schemas.lesson import (
    BossOut,
    ChapterOut,
    LessonAttemptFeedbackCreate,
    LessonAttemptFeedbackOut,
    LessonCompleteResponse,
    LessonOut,
    MarkLessonCompleteRequest,
)
from app.services import achievement_service

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/chapters", response_model=list[ChapterOut])
async def list_chapters(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chapter).where(Chapter.is_published == True).order_by(Chapter.order_index)
    )
    chapters = result.scalars().all()

    uid = uuid.UUID(user_id)
    out = []
    for chapter in chapters:
        ls_result = await db.execute(
            select(Lesson)
            .where(Lesson.chapter_id == chapter.id, Lesson.is_published == True)
            .order_by(Lesson.order_index)
        )
        lessons = ls_result.scalars().all()

        # Completed lesson IDs for this user (stars >= 3 = completed)
        done_result = await db.execute(
            select(UserLessonProgress.lesson_id).where(
                UserLessonProgress.user_id == uid,
                UserLessonProgress.lesson_id.in_([l.id for l in lessons]),
                UserLessonProgress.completed == True,
            )
        )
        done_ids = set(done_result.scalars().all())
        total = len(lessons)
        done = len(done_ids)
        progress_pct = (done / total * 100) if total else 0.0

        lessons_out = [
            LessonOut(
                id=l.id,
                title=l.title,
                video_url=l.video_url,
                video_duration=l.video_duration,
                action_prompt=l.action_prompt,
                order_index=l.order_index,
                is_completed=l.id in done_ids,
            )
            for l in lessons
        ]

        # Boss – one per chapter
        boss_result = await db.execute(
            select(Boss).where(Boss.chapter_id == chapter.id, Boss.is_published == True)
        )
        boss = boss_result.scalar_one_or_none()
        boss_out = None
        if boss:
            is_unlocked = progress_pct >= chapter.boss_unlock_threshold
            boss_out = BossOut(
                id=boss.id,
                name=boss.name,
                avatar_url=boss.avatar_url,
                mission_prompt=boss.mission_prompt,
                max_turns=boss.max_turns,
                pass_score=boss.pass_score,
                is_unlocked=is_unlocked,
                is_published=boss.is_published,
            )

        out.append(
            ChapterOut(
                id=chapter.id,
                title=chapter.title,
                description=chapter.description,
                thumbnail_url=chapter.thumbnail_url,
                order_index=chapter.order_index,
                boss_unlock_threshold=chapter.boss_unlock_threshold,
                is_published=chapter.is_published,
                lessons=lessons_out,
                boss=boss_out,
                progress_percent=round(progress_pct, 1),
            )
        )
    return out


@router.post("/lessons/{lesson_id}/complete", response_model=LessonCompleteResponse)
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
    newly_unlocked: list[str] = []
    if existing.scalar_one_or_none() is None:
        progress = UserLessonProgress(
            user_id=uid,
            lesson_id=lesson_id,
            watched=body.watch_percent >= 80,
            watch_percent=body.watch_percent,
        )
        db.add(progress)
        await db.flush()
        newly_unlocked = await achievement_service.check_and_award_achievements(db, uid)
    return LessonCompleteResponse(newly_unlocked_achievements=newly_unlocked)


@router.post("/lessons/{lesson_id}/feedback", response_model=LessonAttemptFeedbackOut, status_code=201)
async def submit_lesson_feedback(
    lesson_id: uuid.UUID,
    body: LessonAttemptFeedbackCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Save AI-scored feedback for a lesson action attempt."""
    uid = uuid.UUID(user_id)

    # Count previous attempts to set attempt_number
    count_result = await db.execute(
        select(func.count(LessonAttemptFeedback.id)).where(
            LessonAttemptFeedback.user_id == uid,
            LessonAttemptFeedback.lesson_id == lesson_id,
        )
    )
    attempt_number = (count_result.scalar() or 0) + 1

    feedback = LessonAttemptFeedback(
        user_id=uid,
        lesson_id=lesson_id,
        attempt_number=attempt_number,
        **body.model_dump(),
    )
    db.add(feedback)
    await db.flush()
    await db.refresh(feedback)
    return LessonAttemptFeedbackOut(
        id=feedback.id,
        lesson_id=feedback.lesson_id,
        attempt_number=feedback.attempt_number,
        content_score=feedback.content_score,
        speed_score=feedback.speed_score,
        emotion_score=feedback.emotion_score,
        overall_score=feedback.overall_score,
        feedback_text=feedback.feedback_text,
        created_at=feedback.created_at.isoformat(),
    )


@router.get("/lessons/{lesson_id}/feedback", response_model=list[LessonAttemptFeedbackOut])
async def get_lesson_feedbacks(
    lesson_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all feedback attempts for a lesson by the current user."""
    uid = uuid.UUID(user_id)
    result = await db.execute(
        select(LessonAttemptFeedback)
        .where(
            LessonAttemptFeedback.user_id == uid,
            LessonAttemptFeedback.lesson_id == lesson_id,
        )
        .order_by(LessonAttemptFeedback.attempt_number)
    )
    feedbacks = result.scalars().all()
    return [
        LessonAttemptFeedbackOut(
            id=f.id,
            lesson_id=f.lesson_id,
            attempt_number=f.attempt_number,
            content_score=f.content_score,
            speed_score=f.speed_score,
            emotion_score=f.emotion_score,
            overall_score=f.overall_score,
            feedback_text=f.feedback_text,
            created_at=f.created_at.isoformat(),
        )
        for f in feedbacks
    ]
