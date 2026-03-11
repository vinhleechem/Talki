"""Conversation (Boss Fight) endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.schemas.conversation import (
    FeedbackResponse,
    SpeakResponse,
    StartConversationRequest,
    StartConversationResponse,
)
from app.services import conversation_service
from app.services.heart_service import consume_heart

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("/start", response_model=StartConversationResponse, status_code=201)
async def start_conversation(
    body: StartConversationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    try:
        await consume_heart(db, uid)
    except ValueError as e:
        raise HTTPException(status_code=402, detail=str(e))

    try:
        return await conversation_service.start_conversation(db, uid, body.boss_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{conversation_id}/speak", response_model=SpeakResponse)
async def speak(
    conversation_id: uuid.UUID,
    audio: UploadFile = File(..., description="WebM/Opus audio from microphone"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    audio_bytes = await audio.read()
    try:
        return await conversation_service.process_speak_turn(db, conversation_id, audio_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{conversation_id}/feedback", response_model=FeedbackResponse)
async def get_feedback(
    conversation_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await conversation_service.get_feedback(
            db, conversation_id, uuid.UUID(user_id)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
