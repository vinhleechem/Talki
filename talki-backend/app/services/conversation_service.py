"""Core conversation orchestration: start, speak turn, end + feedback."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import (
    Conversation,
    ConversationFeedback,
    ConversationTurn,
    ConversationStatus,
    UserMistake,
)
from app.models.user import User
from app.models.lesson import Boss
from app.schemas.conversation import (
    FeedbackResponse,
    SpeakResponse,
    StartConversationResponse,
    TurnFeedback,
)
from app.services import ai_service, stt_service, tts_service, achievement_service, supabase_storage
from app.utils.text_analysis import count_filler_words, total_filler_count


async def start_conversation(
    db: AsyncSession,
    user_id: uuid.UUID,
    boss_id: uuid.UUID,
) -> StartConversationResponse:
    boss = await db.get(Boss, boss_id)
    if not boss:
        raise ValueError("Boss not found")

    convo = Conversation(user_id=user_id, boss_id=boss_id)
    db.add(convo)
    await db.flush()

    # AI sends first greeting
    greeting_text = f"Xin chào! Tôi là {boss.name}. Hãy bắt đầu."
    greeting_audio = await tts_service.synthesize_speech(greeting_text)
    audio_url = f"/audio/{convo.id}/greeting.mp3"  # placeholder; upload to storage in prod

    return StartConversationResponse(
        conversation_id=convo.id,
        boss_name=boss.name,
        greeting_text=greeting_text,
        greeting_audio_url=audio_url,
    )


async def process_speak_turn(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    audio_bytes: bytes,
) -> SpeakResponse:
    convo = await db.get(Conversation, conversation_id)
    if not convo or convo.status != ConversationStatus.active:
        raise ValueError("Conversation not active")

    boss = await db.get(Boss, convo.boss_id)

    # Count existing turns
    result = await db.execute(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == conversation_id)
        .order_by(ConversationTurn.turn_index)
    )
    existing_turns = result.scalars().all()
    # Build history for Gemini
    history = [
        {"role": "user" if i % 2 == 0 else "model", "parts": [t.user_transcript or t.ai_reply_text]}
        for i, t in enumerate(existing_turns)
    ]
    turn_index = len(existing_turns)

    # AI response (Multimodal: Gemini phân tích audio và trả lời)
    user_text, ai_text, should_end = await ai_service.chat_turn(
        persona_prompt=boss.persona_prompt,
        history=history,
        audio_bytes=audio_bytes,
    )

    fillers = count_filler_words(user_text)

    # TTS
    ai_audio = await tts_service.synthesize_speech(ai_text)
    ai_audio_url = f"/audio/{conversation_id}/turn_{turn_index}_ai.mp3"

    # Persist turn
    turn = ConversationTurn(
        conversation_id=conversation_id,
        turn_index=turn_index,
        user_transcript=user_text,
        filler_word_count=fillers,
        ai_reply_text=ai_text,
        ai_audio_url=ai_audio_url,
    )
    db.add(turn)
    await db.flush()

    # Upload user audio
    user_audio_url = await supabase_storage.upload_audio(
        audio_bytes, "boss", convo.user_id, turn.id, content_type="audio/webm"
    )
    if user_audio_url:
        turn.user_audio_url = user_audio_url

    is_last = should_end or (turn_index + 1 >= boss.max_turns)
    if is_last:
        convo.status = ConversationStatus.completed
        convo.ended_at = datetime.now(timezone.utc)
        await db.flush()
        await achievement_service.check_and_award_achievements(db, convo.user_id)

    return SpeakResponse(
        turn_index=turn_index,
        user_transcript=user_text,
        filler_word_count=fillers,
        ai_reply_text=ai_text,
        ai_audio_url=ai_audio_url,
        user_audio_url=turn.user_audio_url,
        is_last_turn=is_last,
    )


async def get_feedback(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> FeedbackResponse:
    convo = await db.get(Conversation, conversation_id)
    if not convo or convo.user_id != user_id:
        raise ValueError("Not found")

    # Return cached feedback if exists
    existing = await db.execute(
        select(ConversationFeedback).where(
            ConversationFeedback.conversation_id == conversation_id
        )
    )
    cached = existing.scalar_one_or_none()
    if cached:
        import json
        advice = json.loads(cached.advice_json or "[]")
        mistakes_json = json.loads(getattr(cached, 'extracted_mistakes_json', "[]"))
        # We don't return the full mistake list in feedback response currently, 
        # but could if we want. It's stored in UserMistake table.
        return FeedbackResponse(
            conversation_id=conversation_id,
            fluency_score=cached.fluency_score,
            confidence_score=cached.confidence_score,
            content_score=cached.content_score,
            total_filler_words=cached.total_filler_words,
            summary_text=cached.summary_text or "",
            advice_per_turn=[TurnFeedback(**a) for a in advice],
            extracted_mistakes=mistakes_json,
        )

    boss = await db.get(Boss, convo.boss_id)
    result = await db.execute(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == conversation_id)
        .order_by(ConversationTurn.turn_index)
    )
    turns_data = [
        {"index": t.turn_index, "user_text": t.user_transcript or "", "ai_text": t.ai_reply_text or ""}
        for t in result.scalars().all()
    ]

    raw = await ai_service.generate_feedback(boss.persona_prompt, turns_data)

    import json
    fb = ConversationFeedback(
        conversation_id=conversation_id,
        fluency_score=raw.get("fluency_score", 0),
        confidence_score=raw.get("confidence_score", 0),
        content_score=raw.get("content_score", 0),
        total_filler_words=raw.get("total_filler_words", 0),
        summary_text=raw.get("summary_text", ""),
        advice_json=json.dumps(raw.get("advice_per_turn", []), ensure_ascii=False),
    )
    db.add(fb)
    
    # Process mistakes
    extracted_mistakes = raw.get("extracted_mistakes", [])
    for mistake in extracted_mistakes:
        word = mistake.get("word_or_phrase")
        m_type = mistake.get("type")
        correction = mistake.get("correction")
        
        if not word:
            continue
            
        # Check if exists
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
                correction=correction,
                occurrence_count=1
            )
            db.add(new_mistake)

    await db.flush() # Ensure mistakes and feedback are saved

    return FeedbackResponse(
        conversation_id=conversation_id,
        fluency_score=fb.fluency_score,
        confidence_score=fb.confidence_score,
        content_score=fb.content_score,
        total_filler_words=fb.total_filler_words,
        summary_text=fb.summary_text or "",
        advice_per_turn=[TurnFeedback(**a) for a in raw.get("advice_per_turn", [])],
        extracted_mistakes=extracted_mistakes,
    )
