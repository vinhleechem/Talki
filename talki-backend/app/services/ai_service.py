"""Google Gemini – AI Mentor chat and feedback generation."""
import json

from google import genai
from google.genai import types

from app.core.config import settings
from app.utils.text_analysis import is_too_short

client = genai.Client(api_key=settings.GEMINI_API_KEY)

GUARDRAIL_KEYWORDS = ["địt", "đéo", "vcl", "vl", "dmm", "fuck", "shit"]

FOLLOW_UP_SUFFIX = (
    "\n(Người dùng trả lời quá ngắn. Hãy hỏi vặn lại để họ giải thích rõ hơn.)"
)


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

    response = await client.aio.models.generate_content(
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
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
    )
    return json.loads(response.text)
