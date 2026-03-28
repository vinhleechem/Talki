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


def _has_farewell_signal(text: str) -> bool:
    """Heuristic to detect natural conversation ending phrases."""
    norm = str(text or "").strip().lower()
    if not norm:
        return False

    farewell_keywords = [
        "tam biet",
        "tạm biệt",
        "bye",
        "goodbye",
        "hen gap lai",
        "hẹn gặp lại",
        "ket thuc",
        "kết thúc",
        "dung o day",
        "dừng ở đây",
        "thoi nhe",
        "thôi nhé",
        "chao nhe",
        "chào nhé",
    ]
    return any(k in norm for k in farewell_keywords)


# ─── Prompt builder ────────────────────────────────────────────────────────────

def build_boss_system_prompt(
    scenario: str,
    personality: str,
    turn_count: int,
    max_turns: int,
) -> str:
    """Build the system prompt for the boss character based on current turn."""
    scenario_context = str(scenario or "Bạn gặp một tình huống giao tiếp thực tế.")
    
    phase_hint = ""
    progress = turn_count / max_turns
    if progress < 0.3:
        phase_hint = (
            "Đây là đầu cuộc trò chuyện. Hãy phản ứng tự nhiên, tiếp tục phát triển tình huống "
            "và khiến người dùng muốn nói chuyện thêm."
        )
    elif progress < 0.7:
        phase_hint = (
            "Cuộc trò chuyện đang diễn ra bình thường. Hãy phản hồi, đặt câu hỏi, hoặc chia sẻ "
            "để tạo ra đối thoại tự nhiên và thực tế."
        )
    else:
        phase_hint = (
            "Cuộc trò chuyện sắp kết thúc. Hãy kết thúc tương tác một cách tự nhiên."
        )

    return f"""HƯỚNG DẪN QUAN TRỌNG: Bạn là một NGƯỜI THẬT trong cuộc sống hàng ngày, KHÔNG phải:
- Sợ lý ảo hay trợ thủ AI
- Giáo viên hoặc hướng dẫn viên
- Người đang kiểm tra hay đánh giá ai

Bạn là một người bình thường đang trò chuyện với một người khác.

TÌNH HUỐNG THỰC TẾ:
{scenario_context}

TÊN/TÍNH CÁCH CÓ THỂ CÓ (để tham khảo):
{personality}

GIAI ĐOẠN HIỆN TẠI (lượt {turn_count + 1}/{max_turns}):
{phase_hint}

NGUYÊN TẮC BẮT BUỘC:
- Luôn ở trong vai, coi mình là người trong cuộc và hành động như thật.
- Chỉ trả lời bằng tiếng Việt, tự nhiên và thoải mái.
- Câu trả lời NGẮN (1-3 câu). Không bao giờ nhắc tới "tình huống", "luyện tập", hay "kiểm tra".
- Phản ứng chân thực theo tính cách và bối cảnh của bạn.
- Nếu người dùng nói không rõ, hãy hỏi lại bình thường ("Sao vậy?", "Cái gì?").
- Không bao giờ ra vẻ giáo viên hay nhận xét lỗi ngữ pháp. Chỉ nói chuyện tự nhiên.

JSON OUTPUT:
Bạn PHẢI trả về kết quả theo định dạng JSON sau (chỉ JSON, không kèm giải thích):
{{
  "reply": "<câu trả lời tự nhiên của bạn>",
  "filler_count": <số lần người dùng dùng từ đệm như ừm, à, ờ, thì, là>,
  "fluency_score": <điểm 0-100 đánh giá sự mạch lạc của người dùng trong lượt này>,
  "content_score": <điểm 0-100 đánh giá nội dung phù hợp với tình huống>
}}"""


def build_evaluation_prompt(
    scenario: str,
    personality: str,
    conversation_history: list[dict],
) -> str:
    """Build the final evaluation prompt for scoring the full session."""
    scenario_context = str(scenario or "")
    trajectory = "\n".join(
        f"{'NGƯỜI DÙNG' if m['role'] == 'user' else 'BOSS'}: {m['content']}"
        for m in conversation_history
    )
    return f"""Bạn là chuyên gia đánh giá kỹ năng giao tiếp tiếng Việt.

TÌNH HUỐNG: {scenario_context}

LỊCH SỬ HỘI THOẠI:
{trajectory}

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
    norm_target = (target_id or "").strip().lower()
    norm_type = (config_type or "stage").strip().lower()

    # 1) Exact match by normalized target + config_type
    result = await db.execute(select(BossConfig))
    all_configs = list(result.scalars().all())

    for c in all_configs:
        if (c.config_type or "").strip().lower() == norm_type and (c.target_id or "").strip().lower() == norm_target:
            return c

    # 2) If request is lesson but missing, try stage with same target
    if norm_type == "lesson":
        for c in all_configs:
            if (c.config_type or "").strip().lower() == "stage" and (c.target_id or "").strip().lower() == norm_target:
                return c

    # 3) Fallback to explicit default config
    for c in all_configs:
        if (c.config_type or "").strip().lower() == "default":
            return c

    # 4) Last resort: any config (oldest first from list_configs ordering behavior)
    return all_configs[0] if all_configs else None


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
    
    Handles both new object-based scenarios/personalities and legacy string formats.
    """
    config = await get_config_for_target(db, target_id, config_type)

    # Pick a random scenario and personality
    scenarios = config.scenarios if config and config.scenarios else [
        {
            "title": "Hang xom kho tinh hoi viec lam",
            "context": "Ban gap hang xom hay soi moi, ho hoi lien tuc ve cong viec va thu nhap cua ban.",
            "greeting_opener": "Dao nay thay ban o nha nhieu, cong viec sao roi?",
        },
        {
            "title": "Dong nghiep day loi trong hop",
            "context": "Trong buoi hop nhom, mot dong nghiep day loi sang ban truoc mat moi nguoi.",
            "greeting_opener": "Van de nay do ben ban xu ly cham, ban noi gi di?",
        },
        {
            "title": "Chu nha tang gia thue dot ngot",
            "context": "Chu nha bao tang gia thue cao hon kha nang cua ban, ban can thuong luong.",
            "greeting_opener": "Thang sau tang them 2 trieu nhe, gia thi truong gio vay roi.",
        },
        {
            "title": "Ban cu muon vay tien",
            "context": "Mot nguoi ban cu nhan tin vay tien them mot lan nua, du truoc do tra no rat tre.",
            "greeting_opener": "Giup toi lan nay nua thoi, toi hua se tra dung han.",
        },
        {
            "title": "Tai xe cong nghe cau gat",
            "context": "Tai xe den don nhung cau gat va phan nan vi diem don, khong khi bat dau cang thang.",
            "greeting_opener": "Ban dat diem don gi ma kho tim vay?",
        },
    ]
    personalities = config.personalities if config and config.personalities else [
        {"eng_key": "pushy-neighbor", "vi_display": "Hang xom soi moi"},
        {"eng_key": "passive-aggressive-colleague", "vi_display": "Dong nghiep da xeo"},
        {"eng_key": "hardline-landlord", "vi_display": "Chu nha cuong"},
        {"eng_key": "sweet-talker-borrower", "vi_display": "Ban cuoi ngot"},
        {"eng_key": "grumpy-driver", "vi_display": "Tai xe cau gat"},
    ]

    scenario_index = random.randrange(len(scenarios))
    selected_scenario = scenarios[scenario_index]
    if isinstance(selected_scenario, str):
        selected_scenario = {
            "title": "Tình huống giao tiếp",
            "context": selected_scenario,
            "greeting_opener": "Chào bạn!",
        }

    # Keep personality aligned with the selected scenario by index.
    selected_personality = personalities[scenario_index % len(personalities)]
    if isinstance(selected_personality, str):
        parts = selected_personality.split("-") if "-" in selected_personality else ["neutral", selected_personality]
        selected_personality = {
            "eng_key": parts[0].strip(),
            "vi_display": parts[-1].strip() if len(parts) > 1 else selected_personality,
        }

    scenario_context = str(selected_scenario.get("context", "Bạn gặp một tình huống giao tiếp thực tế.")).strip()
    greeting_opener = str(selected_scenario.get("greeting_opener", "Chào bạn!")).strip()
    personality_display = str(selected_personality.get("vi_display", "Trung lập")).strip()

    session = BossSession(
        user_id=user_id,
        boss_config_id=config.id if config else None,
        scenario=scenario_context,
        personality=personality_display,
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

    # Use scenario's greeting_opener as the boss's first greeting
    greeting = greeting_opener or "Chào bạn!"
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

    should_finalize_now = (
        new_boss_hp <= 0
        or new_user_hp <= 0
        or session.turn_count >= session.max_turns
        or _has_farewell_signal(transcript)
        or _has_farewell_signal(reply_text)
    )

    if should_finalize_now:
        # Finalize immediately so client never gets stuck when HP hits 0
        # or when either side already signals a natural ending.
        return await boss_evaluate(db, session)

    # 6. TTS for boss reply
    audio_b64 = ""
    try:
        # Extract personality string for voice selection
        personality_str = session.personality.get("vi_display", "neutral") if isinstance(session.personality, dict) else str(session.personality)
        audio_b64 = await tts_service.synthesize_base64(reply_text, personality_str)
    except Exception as e:
        print(f"[Boss TTS] Turn synthesis failed: {e}")

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
        # Extract personality string for voice selection
        personality_str = session.personality.get("vi_display", "neutral") if isinstance(session.personality, dict) else str(session.personality)
        audio_b64 = await tts_service.synthesize_base64(closing[:200], personality_str)
    except Exception as e:
        print(f"[Boss TTS] Final synthesis failed: {e}")

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
