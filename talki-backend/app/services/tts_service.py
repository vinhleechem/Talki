"""Gemini TTS — Expressive Vietnamese speech synthesis using Google AI Studio.

Uses gemini-2.5-flash-preview-tts which supports natural emotion in speech.
No extra API key needed — reuses GEMINI_API_KEY.
"""
import asyncio
import base64
import io
import logging
import wave

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

# Gemini TTS model
TTS_MODEL = "gemini-2.5-flash-preview-tts"

# Voice map — all voices support Vietnamese text naturally with emotion
# Full list: https://cloud.google.com/text-to-speech/docs/voices
VOICE_FEMALE = "Aoede"   # Nữ, giọng ấm, cảm xúc tốt
VOICE_MALE   = "Charon"  # Nam, giọng trầm, tự nhiên


def _pick_voice(personality: str) -> str:
    p = (personality or "").lower()
    voice = VOICE_FEMALE if ("female" in p or "nữ" in p) else VOICE_MALE
    logger.info(f"[TTS] Personality='{personality}' → Gemini voice='{voice}'")
    return voice


def _pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
    """Wrap raw PCM bytes in WAV container for browser playback."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)       # mono
        wf.setsampwidth(2)       # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buf.getvalue()


def _synthesize_sync(text: str, voice_name: str) -> bytes:
    """Synchronous Gemini TTS call (runs in thread pool)."""
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=TTS_MODEL,
        contents=text.strip()[:500],
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name,
                    )
                )
            ),
        ),
    )
    pcm = response.candidates[0].content.parts[0].inline_data.data
    return _pcm_to_wav(pcm)


async def synthesize(text: str, personality: str = "") -> bytes:
    """
    Convert text to expressive Vietnamese speech via Gemini TTS.
    Returns WAV bytes.
    """
    if not text:
        return b""

    if not settings.GEMINI_API_KEY:
        logger.warning("[TTS] GEMINI_API_KEY not set. Skipping synthesis.")
        return b""

    voice_name = _pick_voice(personality)

    logger.info(f"[TTS] Calling Gemini TTS model={TTS_MODEL} voice={voice_name} text_len={len(text)}")
    try:
        wav_bytes = await asyncio.to_thread(_synthesize_sync, text, voice_name)
        logger.info(f"[TTS] Gemini TTS success, audio bytes={len(wav_bytes)}")
        return wav_bytes
    except Exception as e:
        logger.error(f"[TTS] Gemini TTS exception: {e}")
        return b""


async def synthesize_base64(text: str, personality: str = "") -> str:
    """Returns base64-encoded WAV audio string for JSON transport."""
    raw = await synthesize(text, personality)
    if not raw:
        return ""
    return base64.b64encode(raw).decode("utf-8")
