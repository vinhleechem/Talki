import uuid

from pydantic import BaseModel


class LessonOut(BaseModel):
    id: uuid.UUID
    title: str
    video_url: str | None
    video_duration: int
    action_prompt: str | None
    order_index: int
    is_completed: bool = False  # populated per-user at query time

    model_config = {"from_attributes": True}


class BossOut(BaseModel):
    id: uuid.UUID
    name: str
    avatar_url: str | None
    mission_prompt: str
    max_turns: int
    pass_score: int
    is_unlocked: bool = False
    is_published: bool = False

    model_config = {"from_attributes": True}


class ChapterOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    thumbnail_url: str | None
    order_index: int
    boss_unlock_threshold: int
    is_published: bool
    lessons: list[LessonOut] = []
    boss: BossOut | None = None
    progress_percent: float = 0.0

    model_config = {"from_attributes": True}


class MarkLessonCompleteRequest(BaseModel):
    watch_percent: int = 100
