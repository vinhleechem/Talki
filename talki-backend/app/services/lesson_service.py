import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson, LessonAttemptFeedback, UserLessonProgress
from app.models.conversation import UserMistake
from app.models.user import User, EnergyLog
from app.schemas.lesson import LessonAttemptFeedbackOut
from app.services import ai_service, heart_service, achievement_service, payment_service
from app.services import supabase_storage


async def evaluate_practice(
    db: AsyncSession,
    user_id: uuid.UUID,
    lesson_id: uuid.UUID,
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
) -> LessonAttemptFeedbackOut:
    """
    Handle a practice audio upload for a given lesson:
    - Consume 1 heart
    - Transcribe audio
    - Send to AI for scoring against lesson's action prompt
    - Save feedback and detect mistakes
    - Save to UserLessonProgress (update attempts and scores)
    """
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise ValueError("Lesson not found")

    # Consume energy for this attempt (cost from admin config)
    config = await payment_service.get_or_create_manual_config(db)
    lesson_cost = config.lesson_practice_cost
    await heart_service.consume_energy(
        db,
        user_id,
        amount=lesson_cost,
        reason="lesson_action",
        reference_id=lesson_id,
    )

    # Gọi AI để đánh giá (Multimodal: Gemini phân tích trực tiếp audio)
    # Nếu Gemini lỗi hoàn toàn → hoàn heart lại và báo lỗi
    try:
        analysis = await ai_service.evaluate_lesson_practice(
            action_prompt=lesson.action_prompt or "Tình huống giao tiếp cơ bản",
            audio_bytes=audio_bytes,
            mime_type=mime_type
        )
    except Exception as ai_err:
        # Refund energy since AI failed (not user's fault)
        try:
            user_obj = await db.get(User, user_id)
            if user_obj:
                user_obj.energy = min(user_obj.energy + lesson_cost, user_obj.max_energy)
                db.add(EnergyLog(
                    user_id=user_id,
                    delta=lesson_cost,
                    reason="ai_error_refund",
                    energy_after=user_obj.energy,
                ))
        except Exception:
            pass
        raise RuntimeError(f"AI không phân tích được audio. Vui lòng thử lại. ({ai_err})") from ai_err

    user_text = analysis.get("transcript", "")
    # Không raise khi transcript rỗng – AI vẫn trả điểm (audio quá ngắn/yên lặng)
    # Chỉ log warning để biết

    # AI evaluation
    # The new ai_service.evaluate_lesson_practice now returns the full analysis
    raw_feedback = analysis

    content_score = float(raw_feedback.get("content_score", 0))
    speed_score = float(raw_feedback.get("fluency_score", 0))
    emotion_score = float(raw_feedback.get("confidence_score", 0))
    overall_score = float(raw_feedback.get("overall_score", 0))
    feedback_text = raw_feedback.get("feedback_text", "")
    content_feedback = raw_feedback.get("content_feedback", "")
    speed_feedback = raw_feedback.get("speed_feedback", "")
    emotion_feedback = raw_feedback.get("emotion_feedback", "")
    advice_text = raw_feedback.get("advice_text", "")
    filler_word_count = int(raw_feedback.get("total_filler_words", 0))
    extracted_mistakes = raw_feedback.get("extracted_mistakes", [])

    overall_stars = min(5, max(0, int(overall_score / 20)))

    # Count previous attempts
    count_result = await db.execute(
        select(func.count(LessonAttemptFeedback.id)).where(
            LessonAttemptFeedback.user_id == user_id,
            LessonAttemptFeedback.lesson_id == lesson_id,
        )
    )
    attempt_number = (count_result.scalar() or 0) + 1

    # Save Feedback
    feedback = LessonAttemptFeedback(
        user_id=user_id,
        lesson_id=lesson_id,
        attempt_number=attempt_number,
        stars=overall_stars,
        content_score=content_score,
        speed_score=speed_score,
        emotion_score=emotion_score,
        overall_score=overall_score,
        feedback_text=feedback_text,
        transcript=user_text,
        content_feedback=content_feedback,
        speed_feedback=speed_feedback,
        emotion_feedback=emotion_feedback,
        advice_text=advice_text or feedback_text,
        filler_word_count=filler_word_count,
        mistakes=extracted_mistakes,
    )
    db.add(feedback)
    await db.flush()

    # Upload audio lên Supabase Storage (lưu 3 ngày), gán audio_url
    # Dùng mime_type thực tế từ client thay vì hardcode
    upload_content_type = mime_type if mime_type else "audio/webm"
    audio_url = await supabase_storage.upload_audio(
        audio_bytes, "practice", user_id, feedback.id, content_type=upload_content_type
    )
    if audio_url:
        feedback.audio_url = audio_url
        await db.flush()  # Lưu URL ngay lập tức

    # Process extracted mistakes
    for mistake in extracted_mistakes:
        word = mistake.get("word_or_phrase")
        m_type = mistake.get("type")
        correction = mistake.get("correction")

        if not word:
            continue

        existing_mistake_query = await db.execute(
            select(UserMistake).where(
                UserMistake.user_id == user_id,
                UserMistake.word_or_phrase == word
            )
        )
        existing_mistake = existing_mistake_query.scalar_one_or_none()

        if existing_mistake:
            existing_mistake.occurrence_count += 1
            existing_mistake.last_seen_at = datetime.now(timezone.utc)
            if m_type:
                existing_mistake.mistake_type = m_type
            if correction:
                existing_mistake.correction = correction
        else:
            new_mistake = UserMistake(
                user_id=user_id,
                word_or_phrase=word,
                mistake_type=m_type,
                correction=correction, # Ensure model supports this
                occurrence_count=1
            )
            db.add(new_mistake)

    # Update UserLessonProgress
    existing_prog_result = await db.execute(
        select(UserLessonProgress).where(
            UserLessonProgress.user_id == user_id,
            UserLessonProgress.lesson_id == lesson_id,
        )
    )
    progress = existing_prog_result.scalar_one_or_none()

    if not progress:
        progress = UserLessonProgress(
            user_id=user_id,
            lesson_id=lesson_id,
            watched=False,
            watch_percent=0,
            stars=overall_stars,
            attempts=1,
            best_score=round(overall_score),
            completed=(round(overall_score) >= 60),
            transcript=user_text,
            audio_url=feedback.audio_url,
            completed_at=datetime.now(timezone.utc) if round(overall_score) >= 60 else None,
        )
        db.add(progress)
    else:
        progress.attempts += 1
        progress.transcript = user_text
        
        new_score = round(overall_score)
        
        if new_score > progress.best_score:
            progress.best_score = new_score
            progress.stars = overall_stars
            progress.audio_url = feedback.audio_url

        if not progress.completed and new_score >= 60:
            progress.completed = True
            progress.completed_at = datetime.now(timezone.utc)
            # stars đã được cập nhật ở dòng trên (vì 60 > best_score ban đầu)
            if feedback.audio_url and not progress.audio_url:
                progress.audio_url = feedback.audio_url

    await db.flush()

    # Reward achievements
    await achievement_service.check_and_award_achievements(db, user_id)
    await db.refresh(feedback)

    return LessonAttemptFeedbackOut(
        id=feedback.id,
        lesson_id=feedback.lesson_id,
        attempt_number=feedback.attempt_number,
        stars=feedback.stars,
        score=round(feedback.overall_score),
        content_score=feedback.content_score,
        speed_score=feedback.speed_score,
        emotion_score=feedback.emotion_score,
        overall_score=feedback.overall_score,
        audio_url=feedback.audio_url,
        feedback_text=feedback.feedback_text,
        content_feedback=feedback.content_feedback,
        speed_feedback=feedback.speed_feedback,
        emotion_feedback=feedback.emotion_feedback,
        advice_text=feedback.advice_text,
        filler_word_count=feedback.filler_word_count,
        extracted_mistakes=extracted_mistakes,
        transcript=feedback.transcript,
        created_at=feedback.created_at.isoformat(),
    )
