"""Learning path endpoints – chapters, lessons, progress (V2.1: no separate levels table)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.boss import BossConfig
from app.models.lesson import (
    Chapter,
    Lesson,
    LessonAttemptFeedback,
    UserLessonProgress,
)
from app.schemas.lesson import (
    BossOut,
    ChapterOut,
    LessonAttemptFeedbackOut,
    LessonAttemptHistoryOut,
    LessonCompleteResponse,
    LessonOut,
    MarkLessonCompleteRequest,
)
from app.services import achievement_service, lesson_service

router = APIRouter(prefix="/lessons", tags=["lessons"])


def _pick_personality_display(raw: list | None) -> str:
    """Extract a readable personality label from BossConfig JSON."""
    first = (raw or [None])[0]
    if isinstance(first, dict):
        return str(first.get("vi_display") or first.get("eng_key") or "Boss")
    if isinstance(first, str):
        if "-" in first:
            return first.split("-", 1)[-1].strip()
        return first.strip()
    return "Boss"


def _pick_mission_prompt(raw: list | None) -> str:
    """Extract a readable mission text from BossConfig scenarios JSON."""
    first = (raw or [None])[0]
    if isinstance(first, dict):
        title = str(first.get("title") or "").strip()
        context = str(first.get("context") or "").strip()
        if title and context:
            return f"{title}: {context}"
        if context:
            return context
        if title:
            return title
    if isinstance(first, str):
        return first.strip()
    return "Hoàn thành thử thách giao tiếp của chapter để vượt qua Boss Fight."


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

        # Bài đạt >= 3 sao ↔ completed=True (vì completed chỉ được set khi score >= 60 = 3 sao)
        # Dùng best_score >= 60 thay vì stars >= 3 để tránh lỗi data cũ có stars=0
        # FIX: Chỉ dùng best_score >= 60 là điều kiện chính
        # (nếu completed=False nhưng best_score>=60 = data cũ → vẫn tính là hoàn thành)
        done_result = await db.execute(
            select(UserLessonProgress.lesson_id).where(
                UserLessonProgress.user_id == uid,
                UserLessonProgress.lesson_id.in_([l.id for l in lessons]),
                UserLessonProgress.best_score >= 60,
            )
        )
        done_ids = set(done_result.scalars().all())
        total = len(lessons)
        done = len(done_ids)
        progress_pct = (done / total * 100) if total else 100.0

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

        # Boss config – one per chapter (new production flow)
        cfg_result = await db.execute(
            select(BossConfig).where(BossConfig.chapter_id == chapter.id)
        )
        cfg = cfg_result.scalar_one_or_none()
        boss_out = None
        if cfg:
            is_unlocked = progress_pct >= chapter.boss_unlock_threshold
            personality_label = _pick_personality_display(cfg.personalities)
            mission_prompt = _pick_mission_prompt(cfg.scenarios)
            boss_out = BossOut(
                id=cfg.id,
                name=f"Boss - {personality_label}",
                avatar_url=cfg.avatar_url,
                mission_prompt=mission_prompt,
                max_turns=7,
                pass_score=60,
                is_unlocked=is_unlocked,
                is_published=True,
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


@router.post("/{lesson_id}/complete", response_model=LessonCompleteResponse)
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
    progress = existing.scalar_one_or_none()
    newly_unlocked: list[str] = []
    
    if progress:
        # Cập nhật nếu đã có (ví dụ đã tập nói trước khi xem xong video)
        progress.watched = True
        progress.watch_percent = max(progress.watch_percent, body.watch_percent)
    else:
        # Tạo mới nếu chưa có gì
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



@router.post("/{lesson_id}/submit", response_model=LessonAttemptFeedbackOut, status_code=201)
async def submit_lesson_practice(
    lesson_id: uuid.UUID,
    audio: UploadFile = File(..., description="WebM/Opus audio from microphone"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Save AI-scored feedback for a lesson action attempt from an audio upload."""
    uid = uuid.UUID(user_id)
    audio_bytes = await audio.read()
    
    try:
        return await lesson_service.evaluate_practice(db, uid, lesson_id, audio_bytes, mime_type=audio.content_type)
    except ValueError as e:
        error_message = str(e)
        normalized = error_message.lower()
        if (
            "heart" in normalized
            or "energy" in normalized
            or "năng lượng" in normalized
            or "khong du nang luong" in normalized
            or "không đủ năng lượng" in normalized
        ):
            raise HTTPException(status_code=402, detail=str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi máy chủ: {str(e)}")

@router.get("/my-history", response_model=list[LessonAttemptHistoryOut])
async def get_my_history(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Toàn bộ lịch sử luyện tập của user, kèm tên bài/chương, mới nhất trước."""
    uid = uuid.UUID(user_id)
    result = await db.execute(
        select(LessonAttemptFeedback, Lesson, Chapter)
        .join(Lesson, LessonAttemptFeedback.lesson_id == Lesson.id)
        .join(Chapter, Lesson.chapter_id == Chapter.id)
        .where(LessonAttemptFeedback.user_id == uid)
        .order_by(LessonAttemptFeedback.created_at.desc())
        .limit(5)
    )
    rows = result.all()
    return [
        LessonAttemptHistoryOut(
            id=f.id,
            lesson_id=f.lesson_id,
            lesson_title=lesson.title,
            chapter_title=chapter.title,
            attempt_number=f.attempt_number,
            stars=f.stars,
            score=round(f.overall_score),
            content_score=f.content_score,
            speed_score=f.speed_score,
            emotion_score=f.emotion_score,
            overall_score=f.overall_score,
            audio_url=f.audio_url,
            transcript=f.transcript,
            feedback_text=f.feedback_text,
            content_feedback=f.content_feedback,
            speed_feedback=f.speed_feedback,
            emotion_feedback=f.emotion_feedback,
            advice_text=f.advice_text,
            filler_word_count=f.filler_word_count,
            extracted_mistakes=f.mistakes or [],
            created_at=f.created_at.isoformat(),
        )
        for f, lesson, chapter in rows
    ]


@router.get("/{lesson_id}/feedback", response_model=list[LessonAttemptFeedbackOut])
async def get_lesson_feedbacks(
    lesson_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Lịch sử các lần luyện tập của user cho một bài học (mới nhất trước)."""
    uid = uuid.UUID(user_id)
    result = await db.execute(
        select(LessonAttemptFeedback)
        .where(
            LessonAttemptFeedback.user_id == uid,
            LessonAttemptFeedback.lesson_id == lesson_id,
        )
        .order_by(LessonAttemptFeedback.created_at.desc())
        .limit(5)
    )
    feedbacks = result.scalars().all()
    return [
        LessonAttemptFeedbackOut(
            id=f.id,
            lesson_id=f.lesson_id,
            attempt_number=f.attempt_number,
            stars=f.stars,
            score=round(f.overall_score),
            content_score=f.content_score,
            speed_score=f.speed_score,
            emotion_score=f.emotion_score,
            overall_score=f.overall_score,
            audio_url=f.audio_url,
            feedback_text=f.feedback_text,
            content_feedback=f.content_feedback,
            speed_feedback=f.speed_feedback,
            emotion_feedback=f.emotion_feedback,
            advice_text=f.advice_text,
            filler_word_count=f.filler_word_count,
            extracted_mistakes=f.mistakes or [],
            transcript=f.transcript,
            created_at=f.created_at.isoformat(),
        )
        for f in feedbacks
    ]
