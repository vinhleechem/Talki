"""Google Cloud Text-to-Speech — synthesize Vietnamese audio for Boss replies."""
import base64
import html
import json
import os
from pathlib import Path

try:
    from google.cloud import texttospeech
    from google.oauth2 import service_account
    _TTS_AVAILABLE = True
except ImportError:
    _TTS_AVAILABLE = False

from app.core.config import settings


def _get_client():
    if not _TTS_AVAILABLE:
        raise RuntimeError(
            "google-cloud-texttospeech chưa được cài. Hãy chạy: "
            "pip install google-cloud-texttospeech"
        )

    raw = (getattr(settings, "GOOGLE_CLOUD_CREDENTIALS_JSON", "") or "").strip()
    if not raw:
        raw = (os.getenv("GOOGLE_CLOUD_CREDENTIALS_JSON") or "").strip()
    if not raw:
        raw = (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "").strip()
    if raw.startswith("{"):
        # Inline JSON credentials
        info = json.loads(raw)
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        return texttospeech.TextToSpeechClient(credentials=creds)

    # File path credentials
    path = raw
    if path and not os.path.exists(path):
        # Try Docker /keys/ fallback
        filename = Path(path.replace("\\", "/")).name
        fallback = f"/keys/{filename}"
        if os.path.exists(fallback):
            path = fallback

    if path and os.path.exists(path):
        creds = service_account.Credentials.from_service_account_file(
            path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        return texttospeech.TextToSpeechClient(credentials=creds)

    # ADC (Application Default Credentials)
    return texttospeech.TextToSpeechClient()


# Voice mapping by gender keyword in personality string
VOICE_MAP = {
    "female": "vi-VN-Neural2-A",
    "male": "vi-VN-Neural2-D",
    "neutral": "vi-VN-Neural2-A",
    "default": "vi-VN-Neural2-A",
}


def _pick_voice(personality: str) -> str:
    p = personality.lower()
    if "male" in p and "fe" not in p:
        return VOICE_MAP["male"]
    if "female" in p or "nữ" in p:
        return VOICE_MAP["female"]
    return VOICE_MAP["default"]


def _pick_prosody(personality: str) -> tuple[str, str, str]:
    """Return (rate, pitch, volume_gain_db) based on personality hints."""
    p = (personality or "").lower()

    if any(k in p for k in ["gắt", "cau gat", "grumpy", "hardline", "cuong"]):
        return ("103%", "+1st", "+1dB")
    if any(k in p for k in ["vui", "than thien", "friendly", "enthusiastic", "ngot"]):
        return ("100%", "+2st", "+2dB")
    if any(k in p for k in ["da xeo", "passive", "aggressive", "soi moi", "pushy"]):
        return ("104%", "+0st", "+1dB")
    return ("100%", "+0st", "+0dB")


def _build_ssml(text: str, personality: str) -> str:
    safe_text = html.escape((text or "")[:500])
    rate, pitch, volume = _pick_prosody(personality)
    return (
        "<speak>"
        f"<prosody rate=\"{rate}\" pitch=\"{pitch}\" volume=\"{volume}\">"
        f"{safe_text}"
        "</prosody>"
        "</speak>"
    )


async def synthesize(text: str, personality: str = "") -> bytes:
    """
    Convert text to Vietnamese speech.
    Returns raw MP3 bytes.
    """
    if not text:
        return b""

    client = _get_client()
    voice_name = _pick_voice(personality)

    ssml = _build_ssml(text, personality)
    synthesis_input = texttospeech.SynthesisInput(ssml=ssml)
    voice = texttospeech.VoiceSelectionParams(
        language_code="vi-VN",
        name=voice_name,
    )
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

    try:
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
    except Exception:
        # Fallback to plain text synthesis if SSML parsing fails.
        response = client.synthesize_speech(
            input=texttospeech.SynthesisInput(text=text[:500]),
            voice=voice,
            audio_config=audio_config,
        )
    return response.audio_content


async def synthesize_base64(text: str, personality: str = "") -> str:
    """Returns base64-encoded MP3 audio string for JSON transport."""
    raw = await synthesize(text, personality)
    return base64.b64encode(raw).decode("utf-8")
