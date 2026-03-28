"""Google Cloud Text-to-Speech — synthesize Vietnamese audio for Boss replies."""
import base64
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


async def synthesize(text: str, personality: str = "") -> bytes:
    """
    Convert text to Vietnamese speech.
    Returns raw MP3 bytes.
    """
    if not text:
        return b""

    client = _get_client()
    voice_name = _pick_voice(personality)

    synthesis_input = texttospeech.SynthesisInput(text=text[:500])  # cap at 500 chars
    voice = texttospeech.VoiceSelectionParams(
        language_code="vi-VN",
        name=voice_name,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=1.0,
        pitch=0.0,
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )
    return response.audio_content


async def synthesize_base64(text: str, personality: str = "") -> str:
    """Returns base64-encoded MP3 audio string for JSON transport."""
    raw = await synthesize(text, personality)
    return base64.b64encode(raw).decode("utf-8")
