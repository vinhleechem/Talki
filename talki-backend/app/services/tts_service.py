"""Text-to-Speech using Google Cloud TTS – returns MP3 bytes."""
try:
    from google.cloud import texttospeech
    _TTS_AVAILABLE = True
except ImportError:
    _TTS_AVAILABLE = False

from app.core.config import settings


def _get_client():
    if not _TTS_AVAILABLE:
        raise RuntimeError("google-cloud-texttospeech not installed. Run: pip install google-cloud-texttospeech")
    if settings.GOOGLE_CLOUD_CREDENTIALS_JSON:
        return texttospeech.TextToSpeechClient.from_service_account_file(
            settings.GOOGLE_CLOUD_CREDENTIALS_JSON
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
