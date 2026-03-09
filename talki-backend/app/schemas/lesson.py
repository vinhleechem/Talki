import uuid

from pydantic import BaseModel


class LessonOut(BaseModel):
    id: uuid.UUID
    title: str
    video_url: str | None
    duration_seconds: int
    order_index: int
    is_completed: bool = False  # populated per-user at query time

    model_config = {"from_attributes": True}


class ChapterOut(BaseModel):
    id: uuid.UUID
    title: str
    order_index: int
    lessons: list[LessonOut] = []
    progress_percent: float = 0.0

    model_config = {"from_attributes": True}


class BossOut(BaseModel):
    id: uuid.UUID
    name: str
    avatar_url: str | None
    max_turns: int
    is_unlocked: bool = False

    model_config = {"from_attributes": True}


class LevelOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    order_index: int
    boss_unlock_threshold: int
    chapters: list[ChapterOut] = []
    boss: BossOut | None = None

    model_config = {"from_attributes": True}


class MarkLessonCompleteRequest(BaseModel):
    watch_percent: int = 100
