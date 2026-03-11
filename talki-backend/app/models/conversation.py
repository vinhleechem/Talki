"""ORM models – Conversation (Boss Fight session) and Turns."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
import enum


class ConversationStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class Conversation(Base):
    """One Boss Fight session."""

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    boss_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bosses.id", ondelete="CASCADE")
    )
    status: Mapped[ConversationStatus] = mapped_column(
        Enum(ConversationStatus), default=ConversationStatus.active
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    turns: Mapped[list["ConversationTurn"]] = relationship(back_populates="conversation")
    feedback: Mapped["ConversationFeedback"] = relationship(
        back_populates="conversation", uselist=False
    )


class ConversationTurn(Base):
    """Single exchange (user speak → AI reply)."""

    __tablename__ = "conversation_turns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE")
    )
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # User side
    user_audio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    user_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    filler_word_count: Mapped[int] = mapped_column(Integer, default=0)

    # AI side
    ai_reply_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_audio_url: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="turns")


class ConversationFeedback(Base):
    """Post-session scorecard persisted after conversation ends."""

    __tablename__ = "conversation_feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), unique=True
    )

    fluency_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0–10
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    content_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_filler_words: Mapped[int] = mapped_column(Integer, default=0)

    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    advice_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    """JSON array: [{turn_index, advice}]"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="feedback")


class UserMistake(Base):
    """Accumulated filler-word / mistake log per user (Sổ tay lỗi)."""

    __tablename__ = "user_mistakes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    word_or_phrase: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # E.g. 'grammar', 'vocabulary', 'pronunciation', 'filler'
    mistake_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    correction: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
