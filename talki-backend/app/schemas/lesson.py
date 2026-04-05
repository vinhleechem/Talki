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


class LessonCompleteResponse(BaseModel):
    newly_unlocked_achievements: list[str] = []


class ExtractedMistakeOut(BaseModel):
    word_or_phrase: str
    type: str | None = None
    correction: str | None = None


class LessonAttemptFeedbackOut(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    attempt_number: int
    stars: int
    score: int
    content_score: float
    speed_score: float
    emotion_score: float
    overall_score: float
    audio_url: str | None = None
    feedback_text: str | None = None
    content_feedback: str | None = None
    speed_feedback: str | None = None
    emotion_feedback: str | None = None
    advice_text: str | None = None
    filler_word_count: int = 0
    extracted_mistakes: list[ExtractedMistakeOut] = []
    transcript: str | None = None
    created_at: str

    model_config = {"from_attributes": True}


class LessonAttemptHistoryOut(BaseModel):
    """Flat feedback record enriched with lesson/chapter info for history view."""
    id: uuid.UUID
    lesson_id: uuid.UUID
    lesson_title: str
    chapter_title: str
    attempt_number: int
    stars: int
    score: int
    content_score: float
    speed_score: float
    emotion_score: float
    overall_score: float
    audio_url: str | None = None
    transcript: str | None = None
    feedback_text: str | None = None
    content_feedback: str | None = None
    speed_feedback: str | None = None
    emotion_feedback: str | None = None
    advice_text: str | None = None
    filler_word_count: int = 0
    extracted_mistakes: list[ExtractedMistakeOut] = []
    created_at: str
