"""Boss Fight service – manages sessions, conversation turns, and scoring."""
import uuid
import random
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.boss import BossConfig, BossSession
from app.models.user import User
from app.services import tts_service
from app.services.stt_service import transcribe_audio


# ─── Prompt builder ────────────────────────────────────────────────────────────

def build_boss_system_prompt(
    scenario: str,
    personality: str,
    turn_count: int,
    max_turns: int,
) -> str:
    """Build the system prompt for the boss character based on current turn."""
    phase_hint = ""
    progress = turn_count / max_turns
    if progress < 0.3:
        phase_hint = (
            "Đây là đầu cuộc trò chuyện. Hãy giới thiệu bản thân và đặt bối cảnh tình huống "
            "một cách tự nhiên. Câu đầu tiên cần ngắn và thu hút người dùng vào cuộc trò chuyện."
        )
    elif progress < 0.7:
        phase_hint = (
            "Cuộc trò chuyện đang diễn ra. Hãy phản hồi và đặt câu hỏi ngược lại để thử thách "
            "và kéo người dùng tiếp tục nói chuyện."
        )
    else:
        phase_hint = (
            "Cuộc trò chuyện sắp kết thúc. Hãy tổng kết cuộc trò chuyện một cách tự nhiên "
            "và kết thúc tình huống một cách hợp lý."
        )

    return f"""Bạn đang đóng vai một nhân vật trong tình huống giao tiếp tiếng Việt thực tế.

THÔNG TIN VAI DIỄN:
- Tình huống: {scenario}
- Tính cách / Vai diễn: {personality}

GIAI ĐOẠN HIỆN TẠI (lượt {turn_count + 1}/{max_turns}):
{phase_hint}

NGUYÊN TẮC BẮT BUỘC:
- Luôn ở trong vai, KHÔNG bao giờ thoát vai hoặc giải thích rằng bạn là AI.
- Chỉ trả lời bằng tiếng Việt, tự nhiên như người Việt thực sự nói chuyện.
- Câu trả lời NGẮN (1-3 câu). Tình huống phải thực tế và gần gũi như ngoài đời thật.
- Phản ứng tương xứng với tính cách của vai diễn.
- Nếu người dùng nói không rõ hoặc lạc đề, hãy nhẹ nhàng kéo họ về tình huống.
- KHÔNG giảng đạo hay giải thích ngữ pháp. Bạn chỉ là nhân vật, không phải giáo viên.

JSON OUTPUT:
Bạn PHẢI trả về kết quả theo định dạng JSON sau (chỉ JSON, không kèm giải thích):
{{
  "reply": "<câu trả lời của nhân vật>",
  "filler_count": <số lần người dùng dùng từ đệm như ừm, à, ờ, thì, là>,
  "fluency_score": <điểm 0-100 đánh giá sự mạch lạc của người dùng trong lượt này>,
  "content_score": <điểm 0-100 đánh giá nội dung phù hợp tình huống>
}}"""


def build_evaluation_prompt(
    scenario: str,
    personality: str,
    conversation_history: list[dict],
) -> str:
    """Build the final evaluation prompt for scoring the full session."""
    transcript = "\n".join(
        f"{'NGƯỜI DÙNG' if m['role'] == 'user' else 'BOSS'}: {m['content']}"
        for m in conversation_history
    )
    return f"""Bạn là chuyên gia đánh giá kỹ năng giao tiếp tiếng Việt.

TÌNH HUỐNG: {scenario}
VAI DIỄN ĐỐI DIỆN: {personality}

LỊCH SỬ HỘI THOẠI:
{transcript}

Hãy đánh giá kỹ năng giao tiếp của NGƯỜI DÙNG và trả về JSON:
{{
  "score": <tổng điểm 0-100>,
  "fluency_score": <điểm lưu loát 0-100>,
  "confidence_score": <điểm tự tin 0-100>,
  "content_score": <điểm nội dung phù hợp 0-100>,
  "filler_total": <tổng số từ đệm trong toàn bộ cuộc trò chuyện>,
  "feedback": "<nhận xét tổng quát bằng tiếng Việt, ngắn gọn 2-3 câu, khích lệ và cụ thể>"
}}"""


# ─── Boss Service functions ────────────────────────────────────────────────────

async def list_configs(db: AsyncSession) -> list[BossConfig]:
    """Return all boss configurations."""
    result = await db.execute(select(BossConfig).order_by(BossConfig.created_at))
    return list(result.scalars().all())


async def get_config_for_target(
    db: AsyncSession,
    target_id: str,
    config_type: str = "stage",
) -> Optional[BossConfig]:
    """
    Find the best matching BossConfig for a given target.
    Falls back to 'default' config if no specific one found.
    """
    result = await db.execute(
        select(BossConfig).where(
            BossConfig.target_id == target_id,
            BossConfig.config_type == config_type,
        )
    )
    config = result.scalars().first()
    if config:
        return config

    # Fallback to default
    result = await db.execute(
        select(BossConfig).where(BossConfig.config_type == "default")
    )
    return result.scalars().first()


async def create_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    target_id: str,
    config_type: str = "stage",
    max_turns: int = 7,
    pass_score: int = 60,
) -> tuple[BossSession, str]:
    """
    Create a new boss fight session.
    Returns (session, greeting_text).
    """
    config = await get_config_for_target(db, target_id, config_type)

    # Pick a random scenario and personality
    scenarios = config.scenarios if config and config.scenarios else [
        "Bạn gặp một tình huống giao tiếp thực tế."
    ]
    personalities = config.personalities if config and config.personalities else [
        "neutral and professional - trung lập và chuyên nghiệp"
    ]

    scenario = random.choice(scenarios)
    personality = random.choice(personalities)

    # Extract display name from "english key - vietnamese display" format
    boss_name = personality.split("-")[-1].strip().capitalize() if "-" in personality else personality

    session = BossSession(
        user_id=user_id,
        boss_config_id=config.id if config else None,
        scenario=scenario,
        personality=personality,
        conversation_history=[],
        turn_count=0,
        max_turns=max_turns,
        user_hp=100,
        boss_hp=100,
        pass_score=pass_score,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    greeting = f"Xin chào! {scenario}. Hãy bắt đầu nào!"
    return session, greeting


async def process_audio_turn(
    db: AsyncSession,
    session: BossSession,
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
) -> dict:
    """
    Process one audio turn:
    1. Gemini boss_chat_turn (Audio-In) → transcript + reply + scores
    2. Update HP, conversation history
    3. TTS → audio_bytes
    4. Return full result dict
    """
    from app.services.ai_service import boss_chat_turn

    system_prompt = build_boss_system_prompt(
        session.scenario,
        session.personality,
        session.turn_count,
        session.max_turns,
    )

    history = list(session.conversation_history or [])
    is_last = session.turn_count >= session.max_turns - 1

    if is_last:
        # For final turn, we might still want to evaluate the last audio.
        # But for now, we'll keep the logic simple: get results from evaluate.
        # However, to be thorough, we should really process this last audio.
        pass

    # Process turn with NATIVE AUDIO in Gemini
    turn_result = await boss_chat_turn(
        system_prompt=system_prompt,
        history=history,
        audio_bytes=audio_bytes,
        mime_type=mime_type,
    )

    transcript = turn_result.get("transcript", "[Không nghe rõ]")
    reply_text = turn_result.get("reply", "...")
    filler_count = int(turn_result.get("filler_count", 0))
    fluency_score = float(turn_result.get("fluency_score", 50))
    content_score = float(turn_result.get("content_score", 50))

    # 3. Calculate damage/HP (max 30 damage per turn)
    damage_to_boss = min(30, max(5, int((fluency_score + content_score) / 8)))
    damage_to_user = filler_count * 5  # each filler costs 5 HP

    new_boss_hp = max(0, session.boss_hp - damage_to_boss)
    new_user_hp = max(0, session.user_hp - damage_to_user)

    # 4. Update conversation history
    new_history = history + [
        {"role": "user", "content": transcript},
        {"role": "assistant", "content": reply_text},
    ]

    # 5. Persist updates
    session.conversation_history = new_history
    session.turn_count = session.turn_count + 1
    session.boss_hp = new_boss_hp
    session.user_hp = new_user_hp
    await db.commit()

    # 6. TTS for boss reply
    audio_b64 = ""
    try:
        audio_b64 = await tts_service.synthesize_base64(reply_text, session.personality)
    except Exception:
        pass  # Non-fatal; FE shows text even if TTS fails

    return {
        "transcript": transcript,
        "reply": reply_text,
        "audio_b64": audio_b64,
        "damage_to_boss": damage_to_boss,
        "damage_to_user": damage_to_user,
        "filler_count": filler_count,
        "user_hp": new_user_hp,
        "boss_hp": new_boss_hp,
        "turn": session.turn_count,
        "is_final": False,
    }


async def boss_evaluate(
    db: AsyncSession,
    session: BossSession,
    last_transcript: str = "",
) -> dict:
    """Generate final evaluation and close the session."""
    from app.services.ai_service import boss_evaluate as ai_evaluate

    # Append last user turn if provided
    history = list(session.conversation_history or [])
    if last_transcript:
        history.append({"role": "user", "content": last_transcript})

    eval_prompt = build_evaluation_prompt(
        session.scenario,
        session.personality,
        history,
    )

    eval_result = await ai_evaluate(eval_prompt)
    score = int(eval_result.get("score", 55))
    feedback = eval_result.get("feedback", "Bạn đã hoàn thành Boss Fight!")
    passed = score >= session.pass_score

    # Persist result
    session.final_score = score
    session.feedback = feedback
    session.passed = passed
    session.is_complete = True
    session.finished_at = datetime.now(timezone.utc)
    session.conversation_history = history
    await db.commit()

    # TTS for final message
    closing = f"Cuộc trò chuyện kết thúc. {feedback}"
    audio_b64 = ""
    try:
        audio_b64 = await tts_service.synthesize_base64(closing[:200], session.personality)
    except Exception:
        pass

    return {
        "transcript": last_transcript,
        "reply": closing,
        "audio_b64": audio_b64,
        "damage_to_boss": 0,
        "damage_to_user": 0,
        "filler_count": 0,
        "user_hp": session.user_hp,
        "boss_hp": session.boss_hp,
        "turn": session.turn_count,
        "is_final": True,
        "score": score,
        "feedback": feedback,
        "passed": passed,
        "fluency_score": eval_result.get("fluency_score", 0),
        "confidence_score": eval_result.get("confidence_score", 0),
        "content_score": eval_result.get("content_score", 0),
        "filler_total": eval_result.get("filler_total", 0),
    }


# ─── Admin CRUD ────────────────────────────────────────────────────────────────

async def admin_create_config(db: AsyncSession, data: dict) -> BossConfig:
    config = BossConfig(**data)
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def admin_update_config(db: AsyncSession, config_id: uuid.UUID, data: dict) -> Optional[BossConfig]:
    config = await db.get(BossConfig, config_id)
    if not config:
        return None
    for k, v in data.items():
        setattr(config, k, v)
    config.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(config)
    return config


async def admin_delete_config(db: AsyncSession, config_id: uuid.UUID) -> bool:
    config = await db.get(BossConfig, config_id)
    if not config:
        return False
    await db.delete(config)
    await db.commit()
    return True
