"""Core lesson specific actions, like answering a practice action."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson, LessonAttemptFeedback, UserLessonProgress
from app.models.conversation import UserMistake
from app.schemas.lesson import LessonAttemptFeedbackOut
from app.services import ai_service, stt_service, heart_service, achievement_service


async def evaluate_practice(
    db: AsyncSession,
    user_id: uuid.UUID,
    lesson_id: uuid.UUID,
    audio_bytes: bytes,
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

    action_prompt = lesson.action_prompt or "Tình huống giao tiếp cơ bản"

    # Consume 1 heart for the attempt
    await heart_service.consume_heart(
        db,
        user_id,
        reason="lesson_action",
        reference_id=lesson_id,
    )

    # Convert audio to text
    user_text = await stt_service.transcribe_audio(audio_bytes)
    if not user_text.strip():
        raise ValueError("Không nhận diện được giọng nói. Hãy ghi âm lại rõ hơn.")

    # AI evaluation
    raw_feedback = await ai_service.evaluate_lesson_practice(action_prompt, user_text)

    content_score = float(raw_feedback.get("content_score", 0))
    speed_score = float(raw_feedback.get("fluency_score", 0))
    emotion_score = float(raw_feedback.get("confidence_score", 0)) # using confidence as emotion/tone
    overall_score = float(raw_feedback.get("overall_score", 0))
    feedback_text = raw_feedback.get("feedback_text", "")
    content_feedback = raw_feedback.get("content_feedback", "")
    speed_feedback = raw_feedback.get("speed_feedback", "")
    emotion_feedback = raw_feedback.get("emotion_feedback", "")
    advice_text = raw_feedback.get("advice_text", "")
    filler_word_count = int(raw_feedback.get("total_filler_words", 0))
    extracted_mistakes = raw_feedback.get("extracted_mistakes", [])

    # Count previous attempts to set attempt_number
    count_result = await db.execute(
        select(func.count(LessonAttemptFeedback.id)).where(
            LessonAttemptFeedback.user_id == user_id,
            LessonAttemptFeedback.lesson_id == lesson_id,
        )
    )
    attempt_number = (count_result.scalar() or 0) + 1

    # Save Feedback
    overall_stars = min(5, max(0, int(overall_score / 20)))
    feedback = LessonAttemptFeedback(
        user_id=user_id,
        lesson_id=lesson_id,
        attempt_number=attempt_number,
        # Numeric score columns (added via migration 20260313000000)
        content_score=content_score,
        speed_score=speed_score,
        emotion_score=emotion_score,
        overall_score=overall_score,
        feedback_text=feedback_text,
        # Original DB columns
        transcript=user_text,
        stars=overall_stars,
        score=int(overall_score),
        content_feedback=content_feedback,
        speed_feedback=speed_feedback,
        emotion_feedback=emotion_feedback,
        advice_text=advice_text or feedback_text,
        filler_word_count=filler_word_count,
    )
    db.add(feedback)

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
            best_score=int(overall_score),
            completed=(overall_score >= 60),
            transcript=user_text,
            completed_at=datetime.now(timezone.utc) if overall_score >= 60 else None,
        )
        db.add(progress)
    else:
        progress.attempts += 1
        progress.transcript = user_text
        if int(overall_score) > progress.best_score:
            progress.best_score = int(overall_score)
            progress.stars = overall_stars

        if not progress.completed and overall_score >= 60:
            progress.completed = True
            progress.completed_at = datetime.now(timezone.utc)

    await db.flush()

    # Reward achievements
    await achievement_service.check_and_award_achievements(db, user_id)
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
        content_feedback=feedback.content_feedback,
        speed_feedback=feedback.speed_feedback,
        emotion_feedback=feedback.emotion_feedback,
        advice_text=feedback.advice_text,
        filler_word_count=feedback.filler_word_count,
        extracted_mistakes=extracted_mistakes,
        transcript=feedback.transcript,
        created_at=feedback.created_at.isoformat(),
    )
