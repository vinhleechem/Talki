import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.conversation import ConversationStatus


class StartConversationRequest(BaseModel):
    boss_id: uuid.UUID


class StartConversationResponse(BaseModel):
    conversation_id: uuid.UUID
    boss_name: str
    greeting_text: str
    greeting_audio_url: str


class SpeakResponse(BaseModel):
    turn_index: int
    user_transcript: str
    filler_word_count: int
    ai_reply_text: str
    ai_audio_url: str
    user_audio_url: str | None = None
    is_last_turn: bool


class TurnFeedback(BaseModel):
    turn_index: int
    advice: str


class MistakeDetail(BaseModel):
    word_or_phrase: str
    type: str  # e.g., 'grammar', 'vocabulary', 'pronunciation', 'filler'
    correction: str


class FeedbackResponse(BaseModel):
    conversation_id: uuid.UUID
    fluency_score: float
    confidence_score: float
    content_score: float
    total_filler_words: int
    summary_text: str
    advice_per_turn: list[TurnFeedback]
    extracted_mistakes: list[MistakeDetail] = []


class ConversationOut(BaseModel):
    id: uuid.UUID
    boss_id: uuid.UUID
    status: ConversationStatus
    started_at: datetime
    ended_at: datetime | None

    model_config = {"from_attributes": True}
