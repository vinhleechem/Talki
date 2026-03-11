"""Speech-to-Text using Google Cloud Speech-to-Text v1."""
import io

try:
    from google.cloud import speech
    _STT_AVAILABLE = True
except ImportError:
    _STT_AVAILABLE = False

from app.core.config import settings


def _get_client():
    if not _STT_AVAILABLE:
        raise RuntimeError("google-cloud-speech not installed. Run: pip install google-cloud-speech")
    if settings.GOOGLE_CLOUD_CREDENTIALS_JSON:
        return speech.SpeechClient.from_service_account_file(
            settings.GOOGLE_CLOUD_CREDENTIALS_JSON
        )
    return speech.SpeechClient()  # uses GOOGLE_APPLICATION_CREDENTIALS env var


async def transcribe_audio(audio_bytes: bytes, sample_rate: int = 16000) -> str:
    """Convert Vietnamese audio bytes to text."""
    client = _get_client()
    audio = speech.RecognitionAudio(content=audio_bytes)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        sample_rate_hertz=sample_rate,
        language_code="vi-VN",
        enable_automatic_punctuation=True,
    )
    response = client.recognize(config=config, audio=audio)
    if not response.results:
        return ""
    return " ".join(
        result.alternatives[0].transcript for result in response.results
    )
