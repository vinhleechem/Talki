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


def _normalize_mime_type(mime_type: str) -> str:
    """
    Gemini API chỉ chấp nhận base MIME type, không có params.
    Ví dụ: 'audio/webm;codecs=opus' → 'audio/webm'
    """
    return mime_type.split(";")[0].strip() if mime_type else "audio/webm"


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
        "transcript": str(payload.get("transcript", "")).strip(),
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
    audio_bytes: bytes,
) -> tuple[str, str, bool]:
    """
    Send one user audio turn to Gemini.
    Returns (transcript, ai_reply_text, should_end_session).
    """
    contents = []
    # Add persona as system instruction or first user message if needed
    # (Simplified: pre-pend to first message as hidden context if history empty)
    
    for turn in history:
        role = "user" if turn.get("role") == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn.get("parts", [""])[0])]))
    
    # Add new user audio turn
    clean_mime = _normalize_mime_type("audio/webm")
    prompt = (
        f"{_build_system_prompt(persona_prompt)}\n\n"
        "Hãy phản hồi lại người dùng dựa trên audio họ gửi. "
        "PHẢI trả về JSON theo cấu trúc:\n"
        '{\n'
        '  "transcript": "<Văn bản bạn nghe được từ audio>",\n'
        '  "reply": "<Câu trả lời của bạn cho người dùng>",\n'
        '  "should_end": <true/false nếu hội thoại nên kết thúc>\n'
        '}'
    )
    contents.append(types.Content(role="user", parts=[
        types.Part(inline_data=types.Blob(data=audio_bytes, mime_type=clean_mime)),
        types.Part(text=prompt)
    ]))

    response = await _get_client().aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    
    res_json = _parse_json_response(response.text or "", "lượt chat")
    transcript = res_json.get("transcript", "")
    ai_text = res_json.get("reply", "...")
    should_end = res_json.get("should_end", False)

    return transcript, ai_text, should_end


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
        "- ĐÂY LÀ BÀI LUYỆN NÓI (SPEAKING). Transcript được tạo từ Speech-to-Text nên có thể thiếu dấu câu hoặc viết hoa. TUYỆT ĐỐI KHÔNG nhận xét về lỗi dấu câu, chấm phẩy hay viết hoa.\n"
        "Chỉ trả về JSON, không thêm markdown hay giải thích."
    )
    response = await _get_client().aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
    )
    return _parse_json_response(response.text or "", "feedback tổng kết")


async def evaluate_lesson_practice(
    action_prompt: str,
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
) -> dict:
    """
    Evaluate a single user utterance against a lesson's action prompt directly from audio.
    Multimodal approach: No separate STT needed.
    """
    prompt = (
        f"Tình huống (Mục tiêu giao tiếp): {action_prompt}\n\n"
        "Hãy đóng vai GIÁM KHẢO, đánh giá phần thực hành của học viên qua audio và trả về JSON với cấu trúc sau:\n"
        "{\n"
        '  "fluency_score": <0-10>,\n'
        '  "confidence_score": <0-10>,\n'
        '  "content_score": <0-10>,\n'
        '  "overall_score": <0-100>,\n'
        '  "total_filler_words": <số nguyên>,\n'
        '  "transcript": "<Văn bản bạn nghe được từ audio>",\n'
        '  "feedback_text": "<nhận xét tổng quan ngắn gọn>",\n'
        '  "content_feedback": "<nhận xét về nội dung – dùng **từ khoá** để in đậm, *cụm từ* để in nghiêng. Đánh giá xem có bám sát ngữ cảnh không>",\n'
        '  "speed_feedback": "<nhận xét về tốc độ & sự ngập ngừng (hesitation) – dùng **từ khoá** và *cụm từ nhấn mạnh*>",\n'
        '  "emotion_feedback": "<nhận xét về cảm xúc & cường độ giọng nói (intensity) – dùng **từ khoá** và *cụm từ nhấn mạnh*>",\n'
        '  "advice_text": "<lời khuyên cụ thể – dùng **hành động** và *ví dụ* bằng in đậm/in nghiêng>",\n'
        '  "extracted_mistakes": [{"word_or_phrase": "...", "type": "...", "correction": "..."}]\n'
        "}\n"
        "QUY TẮC PHÂN TÍCH AUDIO:\n"
        "- Bạn sẽ nhận được file audio của học viên.\n"
        "- Đánh giá độ trôi chảy (fluency) dựa trên tốc độ, sự NGẬP NGỪNG (quãng nghỉ không tự nhiên) và các từ thừa (filler words).\n"
        "- Đánh giá tông giọng & năng lượng (confidence/emotion) dựa trên CƯỜNG ĐỘ giọng nói, sự tự tin và sắc thái biểu cảm.\n"
        "- So sánh nội dung học viên nói với 'Tình huống (Mục tiêu giao tiếp)' ở trên xem có bám sát và hợp lý không.\n"
        "QUY TẮC ĐỊNH DẠNG:\n"
        "- Trả về JSON thuần, KHÔNG bọc trong markdown code fence, KHÔNG có văn bản thừa.\n"
        "- Dùng **từ** (hai dấu sao) để in đậm, *từ* (một dấu sao) để in nghiêng.\n"
        "- TUYỆT ĐỐI KHÔNG bắt lỗi dấu câu hay viết hoa vì đây là bài luyện nói.\n"
        "Trong đó 'type' của mistake phải là một trong: 'grammar', 'vocabulary', 'pronunciation', 'filler'."
    )
    response = await _get_client().aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part(inline_data=types.Blob(data=audio_bytes, mime_type=_normalize_mime_type(mime_type))),
                    types.Part(text=prompt),
                ],
            )
        ],
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
            "transcript": "",
            "extracted_mistakes": [],
        })
