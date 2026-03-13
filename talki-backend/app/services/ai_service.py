"""Google Gemini – AI Mentor chat and feedback generation."""
import json
import re as _re

from google import genai
from google.genai import types

from app.core.config import settings
from app.utils.text_analysis import is_too_short

GUARDRAIL_KEYWORDS = ["địt", "đéo", "vcl", "vl", "dmm", "fuck", "shit"]

FOLLOW_UP_SUFFIX = (
    "\n(Người dùng trả lời quá ngắn. Hãy hỏi vặn lại để họ giải thích rõ hơn.)"
)


def _get_client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("Chưa cấu hình GEMINI_API_KEY cho AI feedback.")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _extract_json(raw: str) -> str:
    """Strip code fences then find the first {...} JSON object in the text."""
    text = raw.strip()

    # Remove any ``` ... ``` fence variants
    text = _re.sub(r"```(?:json)?\s*", "", text).strip()
    text = text.rstrip("`").strip()

    # Try to grab the first {...} block (handles extra prose before/after)
    match = _re.search(r"\{[\s\S]*\}", text)
    if match:
        return match.group(0)

    return text


def _parse_json_response(raw: str, context: str) -> dict:
    if not raw or not raw.strip():
        raise RuntimeError(f"Gemini không trả về nội dung cho {context}.")

    cleaned = _extract_json(raw)

    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError:
        # Last resort: try the original stripped text
        try:
            payload = json.loads(raw.strip())
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"Gemini không trả về JSON hợp lệ cho {context}. "
                f"Response đầu: {raw[:200]!r}"
            ) from exc

    if not isinstance(payload, dict):
        raise RuntimeError(f"Gemini trả về dữ liệu không hợp lệ cho {context}.")
    return payload


def _normalize_practice_feedback(payload: dict) -> dict:
    mistakes = payload.get("extracted_mistakes", [])
    normalized_mistakes: list[dict] = []
    if isinstance(mistakes, list):
        for mistake in mistakes:
            if not isinstance(mistake, dict):
                continue
            normalized_mistakes.append(
                {
                    "word_or_phrase": str(mistake.get("word_or_phrase", "")).strip(),
                    "type": str(mistake.get("type", "")).strip() or None,
                    "correction": str(mistake.get("correction", "")).strip() or None,
                }
            )

    return {
        "fluency_score": float(payload.get("fluency_score", 0)),
        "confidence_score": float(payload.get("confidence_score", 0)),
        "content_score": float(payload.get("content_score", 0)),
        "overall_score": float(payload.get("overall_score", 0)),
        "total_filler_words": int(payload.get("total_filler_words", 0)),
        "feedback_text": str(payload.get("feedback_text", "")).strip(),
        "content_feedback": str(payload.get("content_feedback", "")).strip(),
        "speed_feedback": str(payload.get("speed_feedback", "")).strip(),
        "emotion_feedback": str(payload.get("emotion_feedback", "")).strip(),
        "advice_text": str(payload.get("advice_text", "")).strip(),
        "extracted_mistakes": normalized_mistakes,
    }


def _build_system_prompt(persona_prompt: str) -> str:
    base_rules = (
        "RULES:\n"
        "- Luôn ở trong vai, không bao giờ thoát vai.\n"
        "- Nếu người dùng dùng từ tục tĩu, cảnh báo nghiêm khắc 1 lần. Lần 2 kết thúc ngay.\n"
        "- Trả lời bằng tiếng Việt.\n"
        "- Giữ câu trả lời ngắn gọn (≤3 câu) để cuộc hội thoại nhanh.\n"
    )
    return f"{persona_prompt}\n\n{base_rules}"


async def chat_turn(
    persona_prompt: str,
    history: list[dict],
    user_text: str,
) -> tuple[str, bool]:
    """
    Send one user turn to Gemini.
    Returns (ai_reply_text, should_end_session).
    should_end_session=True when guardrail triggers second violation.
    """
    # Guardrail check
    violation_count = sum(
        1 for turn in history if turn.get("role") == "user"
        and any(kw in turn.get("parts", [""])[0].lower() for kw in GUARDRAIL_KEYWORDS)
    )
    if any(kw in user_text.lower() for kw in GUARDRAIL_KEYWORDS):
        if violation_count >= 1:
            return "Phiên luyện tập bị kết thúc do vi phạm quy tắc.", True
        return (
            "⚠️ Cảnh báo: Vui lòng giữ thái độ chuyên nghiệp. "
            "Lần sau vi phạm phiên sẽ bị kết thúc.",
            False,
        )

    user_content = user_text
    if is_too_short(user_text):
        user_content = user_text + FOLLOW_UP_SUFFIX

    # Build contents from history + new user message
    contents = []
    for turn in history:
        role = "user" if turn.get("role") == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn.get("parts", [""])[0])]))
    contents.append(types.Content(role="user", parts=[types.Part(text=user_content)]))

    response = await _get_client().aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=_build_system_prompt(persona_prompt),
        ),
    )
    return response.text, False


async def generate_feedback(
    persona_prompt: str,
    turns: list[dict],
) -> dict:
    """
    After session ends, ask Gemini to produce a structured scorecard.
    Returns dict with keys: fluency_score, confidence_score, content_score,
    total_filler_words, summary_text, advice_per_turn.
    """
    transcript = "\n".join(
        f"[Turn {t['index']}] User: {t['user_text']}\nAI: {t['ai_text']}"
        for t in turns
    )
    prompt = (
        f"Kịch bản: {persona_prompt}\n\n"
        f"Transcript hội thoại:\n{transcript}\n\n"
        "Hãy đánh giá buổi luyện tập và trả về JSON với cấu trúc sau:\n"
        "{\n"
        '  "fluency_score": <0-10>,\n'
        '  "confidence_score": <0-10>,\n'
        '  "content_score": <0-10>,\n'
        '  "total_filler_words": <số nguyên>,\n'
        '  "summary_text": "<nhận xét tổng quan>",\n'
        '  "advice_per_turn": [{"turn_index": 0, "advice": "..."}],\n'
        '  "extracted_mistakes": [{"word_or_phrase": "...", "type": "...", "correction": "..."}]\n'
        "}\n"
        "Trong đó 'type' của mistake phải là một trong các giá trị: 'grammar', 'vocabulary', 'pronunciation', 'filler'.\n"
        "Chỉ trả về JSON, không thêm markdown hay giải thích."
    )
    response = await _get_client().aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
    )
    return _parse_json_response(response.text or "", "feedback tổng kết")


async def evaluate_lesson_practice(
    action_prompt: str,
    user_text: str,
) -> dict:
    """
    Evaluate a single user utterance against a lesson's action prompt.
    Returns dict with keys: fluency_score, confidence_score (emotion/tone), content_score,
    overall_score, total_filler_words, feedback_text, extracted_mistakes.
    """
    prompt = (
        f"Tình huống (Mục tiêu giao tiếp): {action_prompt}\n\n"
        f"Câu trả lời của học viên:\n\"{user_text}\"\n\n"
        "Hãy đánh giá phần thực hành của học viên và trả về JSON với cấu trúc sau:\n"
        "{\n"
        '  "fluency_score": <0-10>,\n'
        '  "confidence_score": <0-10>,\n'  # Use this for emotion/tone score
        '  "content_score": <0-10>,\n'
        '  "overall_score": <0-100>,\n'  # Based on 100 max
        '  "total_filler_words": <số nguyên>,\n'
        '  "feedback_text": "<nhận xét tổng quan>",\n'
        '  "content_feedback": "<nhận xét về nội dung – dùng **từ khoá quan trọng** để in đậm, *cụm từ cần chú ý* để in nghiêng>",\n'
        '  "speed_feedback": "<nhận xét về độ trôi chảy/tốc độ – dùng **từ khoá quan trọng** và *cụm từ nhấn mạnh*>",\n'
        '  "emotion_feedback": "<nhận xét về cảm xúc/tông giọng – dùng **từ khoá quan trọng** và *cụm từ nhấn mạnh*>",\n'
        '  "advice_text": "<lời khuyên cụ thể – dùng **hành động cần làm** và *ví dụ minh hoạ* bằng in đậm/in nghiêng>",\n'
        '  "extracted_mistakes": [{"word_or_phrase": "...", "type": "...", "correction": "..."}]\n'
        "}\n"
        "QUY TẮC ĐỊNH DẠNG TEXT:\n"
        "- Dùng **từ hoặc cụm từ** (hai dấu sao) để IN ĐẬM những điểm quan trọng nhất.\n"
        "- Dùng *từ hoặc cụm từ* (một dấu sao) để IN NGHIÊNG những ví dụ hoặc từ cần lưu ý.\n"
        "- Mỗi trường feedback nên có ít nhất 1-2 đoạn in đậm/in nghiêng.\n"
        "Trong đó 'type' của mistake phải là một trong: 'grammar', 'vocabulary', 'pronunciation', 'filler'.\n"
        "Chỉ trả về JSON, không bọc trong markdown code fence."
    )
    response = await _get_client().aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    try:
        return _normalize_practice_feedback(_parse_json_response(response.text or "", "bài practice"))
    except RuntimeError:
        # Fallback: AI trả về không phải JSON – trả về điểm mặc định để user không bị lỗi
        return _normalize_practice_feedback({
            "fluency_score": 5,
            "confidence_score": 5,
            "content_score": 5,
            "overall_score": 50,
            "total_filler_words": 0,
            "feedback_text": "AI không thể phân tích lần này. Hãy thử lại!",
            "content_feedback": "Không thể phân tích nội dung lần này.",
            "speed_feedback": "Không thể phân tích tốc độ lần này.",
            "emotion_feedback": "Không thể phân tích cảm xúc lần này.",
            "advice_text": "Hãy thử ghi âm lại với giọng rõ hơn.",
            "extracted_mistakes": [],
        })
