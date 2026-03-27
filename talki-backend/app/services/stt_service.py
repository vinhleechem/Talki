"""Speech-to-Text using Google Cloud Speech-to-Text v1."""
import json
import os
from pathlib import Path

try:
    from google.cloud import speech
    _STT_AVAILABLE = True
except ImportError:
    _STT_AVAILABLE = False

from app.core.config import settings


def _get_credentials_path() -> str:
    return settings.GOOGLE_CLOUD_CREDENTIALS_JSON or os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")


def _resolve_credentials_path(path_value: str) -> str:
    """Resolve credentials path across host/container path differences.

    Example: when .env contains Windows path `C:\\keys\\file.json` but backend
    runs in Linux container, we try `/keys/file.json` as fallback.
    """
    if os.path.exists(path_value):
        return path_value

    filename = Path(path_value.replace("\\", "/")).name
    if filename:
        docker_fallback = os.path.join("/keys", filename)
        if os.path.exists(docker_fallback):
            return docker_fallback

    return path_value


def _get_credentials_info() -> dict | None:
    raw_value = settings.GOOGLE_CLOUD_CREDENTIALS_JSON.strip()
    if not raw_value:
        return None
    if raw_value.startswith("{"):
        return json.loads(raw_value)
    return None


def _get_client():
    if not _STT_AVAILABLE:
        raise RuntimeError("Chưa cài google-cloud-speech cho tính năng chấm nói bằng AI.")

    credentials_info = _get_credentials_info()
    if credentials_info:
        return speech.SpeechClient.from_service_account_info(credentials_info)

    credentials_path = _get_credentials_path()
    if credentials_path:
        resolved_path = _resolve_credentials_path(credentials_path)
        if not os.path.exists(resolved_path):
            raise RuntimeError(
                "Không tìm thấy file Google Cloud credentials. "
                f"Đã thử: {credentials_path} và /keys/{Path(credentials_path.replace('\\', '/')).name}"
            )
        return speech.SpeechClient.from_service_account_file(
            resolved_path
        )

    try:
        return speech.SpeechClient()
    except Exception as exc:
        raise RuntimeError(
            "Chưa cấu hình Google Cloud Speech credentials. Hãy đặt GOOGLE_CLOUD_CREDENTIALS_JSON hoặc GOOGLE_APPLICATION_CREDENTIALS."
        ) from exc


async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Convert Vietnamese audio bytes to text.

    Raises RuntimeError when STT is not configured so the API can return a clear
    actionable error instead of silently generating fake zero-score feedback.
    """
    if not audio_bytes:
        raise RuntimeError("Không nhận được dữ liệu âm thanh để chấm bài.")

    client = _get_client()
    audio = speech.RecognitionAudio(content=audio_bytes)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        language_code="vi-VN",
        enable_automatic_punctuation=True,
    )
    response = client.recognize(config=config, audio=audio)
    if not response.results:
        return ""
    return " ".join(result.alternatives[0].transcript for result in response.results)
