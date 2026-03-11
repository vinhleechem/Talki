"""ORM models – Level / Chapter / Lesson hierarchy."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Level(Base):
    """Top-level grouping. E.g. 'Giao tiếp cơ bản', 'Kỹ năng Phỏng vấn'."""

    __tablename__ = "levels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    # % of chapter lessons needed to unlock boss (e.g. 30 for basic level)
    boss_unlock_threshold: Mapped[int] = mapped_column(Integer, default=30)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="level")
    boss: Mapped["Boss"] = relationship(back_populates="level", uselist=False)


class Chapter(Base):
    """Topic group inside a level."""

    __tablename__ = "chapters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("levels.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    level: Mapped["Level"] = relationship(back_populates="chapters")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="chapter")


class Lesson(Base):
    """Smallest content unit – Video/Theory."""

    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    video_url: Mapped[str | None] = mapped_column(String, nullable=True)
    content_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    chapter: Mapped["Chapter"] = relationship(back_populates="lessons")


class Boss(Base):
    """One Boss per Level – unlocked when threshold lessons completed."""

    __tablename__ = "bosses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("levels.id", ondelete="CASCADE"), unique=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    persona_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    """System prompt defining the AI role, personality, and scenario."""
    max_turns: Mapped[int] = mapped_column(Integer, default=5)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)

    level: Mapped["Level"] = relationship(back_populates="boss")


class UserLessonProgress(Base):
    """Tracks which lessons a user has completed – used for unlock checks."""

    __tablename__ = "user_lesson_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE")
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    watch_percent: Mapped[int] = mapped_column(Integer, default=0)
