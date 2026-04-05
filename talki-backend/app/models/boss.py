"""SQLAlchemy ORM models – Boss Fight."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class BossConfig(Base):
    """Admin-managed boss fight scenario configuration."""

    __tablename__ = "boss_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # The Chapter this config is tied to (1:1 mapping)
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    
    chapter = relationship("Chapter", lazy="joined")
    # List of scenario strings
    scenarios: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # List of personality strings ("friendly and enthusiastic - ...")
    personalities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Custom image avatar URL
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BossSession(Base):
    """Records a single boss fight session for a user."""

    __tablename__ = "boss_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    boss_config_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("boss_configs.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Snapshot of chosen scenario / personality at time of session creation
    scenario: Mapped[str] = mapped_column(Text, nullable=False)
    personality: Mapped[str] = mapped_column(String(500), nullable=False)

    # Conversation data
    conversation_history: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Combat stats
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    max_turns: Mapped[int] = mapped_column(Integer, default=7)
    user_hp: Mapped[int] = mapped_column(Integer, default=100)
    boss_hp: Mapped[int] = mapped_column(Integer, default=100)
    pass_score: Mapped[int] = mapped_column(Integer, default=60)

    # Result
    final_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="boss_sessions")
