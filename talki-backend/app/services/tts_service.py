"""Text-to-Speech using Google Cloud TTS – returns MP3 bytes."""
import json
import os

try:
    from google.cloud import texttospeech
    _TTS_AVAILABLE = True
except ImportError:
    _TTS_AVAILABLE = False

from app.core.config import settings


def _get_credentials_path() -> str:
    return settings.GOOGLE_CLOUD_CREDENTIALS_JSON or os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")


def _get_credentials_info() -> dict | None:
    raw_value = settings.GOOGLE_CLOUD_CREDENTIALS_JSON.strip()
    if not raw_value:
        return None
    if raw_value.startswith("{"):
        return json.loads(raw_value)
    return None


def _get_client():
    if not _TTS_AVAILABLE:
        raise RuntimeError("google-cloud-texttospeech not installed. Run: pip install google-cloud-texttospeech")
    credentials_info = _get_credentials_info()
    if credentials_info:
        return texttospeech.TextToSpeechClient.from_service_account_info(credentials_info)

    credentials_path = _get_credentials_path()
    if credentials_path:
        if not os.path.exists(credentials_path):
            raise RuntimeError(f"Không tìm thấy file Google Cloud credentials: {credentials_path}")
        return texttospeech.TextToSpeechClient.from_service_account_file(
            credentials_path
        )
    return texttospeech.TextToSpeechClient()


async def synthesize_speech(text: str) -> bytes:
    """Convert text to Vietnamese MP3 audio bytes."""
    client = _get_client()
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="vi-VN",
        name="vi-VN-Standard-A",  # female; swap to B/C/D as needed
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )
    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    return response.audio_content
