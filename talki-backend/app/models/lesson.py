"""ORM models – Chapter / Lesson / Boss hierarchy (V2.1: no separate levels table)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Chapter(Base):
    """Top-level content unit. Has lessons + one boss fight.
    Schema V2.1: chapters IS the top level (no separate 'levels' table).
    """

    __tablename__ = "chapters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    # % of published lessons a user must complete to unlock the boss fight
    boss_unlock_threshold: Mapped[int] = mapped_column(Integer, default=80)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    lessons: Mapped[list["Lesson"]] = relationship(back_populates="chapter", cascade="all, delete-orphan")
    boss: Mapped["Boss"] = relationship(back_populates="chapter", uselist=False, cascade="all, delete-orphan")


class Lesson(Base):
    """Single lesson inside a chapter: Learn (video) → Action (practice) → Feedback."""

    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # Step 1: Learn
    video_url: Mapped[str | None] = mapped_column(String, nullable=True)
    video_duration: Mapped[int] = mapped_column(Integer, default=0)  # seconds
    # Step 2: Action – situation the user must handle
    action_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chapter: Mapped["Chapter"] = relationship(back_populates="lessons")


class Boss(Base):
    """One Boss per Chapter – unlocked when boss_unlock_threshold% of lessons are completed."""

    __tablename__ = "bosses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="CASCADE"), unique=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # Displayed to the player before entering the fight
    mission_prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # System prompt defining the AI's persona and scenario
    persona_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    gender: Mapped[str] = mapped_column(String(10), default="neutral")  # male | female | neutral
    max_turns: Mapped[int] = mapped_column(Integer, default=5)
    # Minimum score (0-100) to pass (3/5 stars = 60%)
    pass_score: Mapped[int] = mapped_column(Integer, default=60)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chapter: Mapped["Chapter"] = relationship(back_populates="boss")


class UserLessonProgress(Base):
    """Tracks a user's progress on a single lesson (The Loop: Learn → Action → Feedback)."""

    __tablename__ = "user_lesson_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE")
    )
    # Learn step
    watched: Mapped[bool] = mapped_column(Boolean, default=False)
    watch_percent: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    # Action + Feedback result
    stars: Mapped[int] = mapped_column(Integer, default=0)      # 0-5
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    best_score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    completed: Mapped[bool] = mapped_column(Boolean, default=False)  # true when stars >= 3
    audio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
