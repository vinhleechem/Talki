-- Migration: add numeric AI score columns to lesson_attempt_feedbacks
-- The original schema stored only text feedback; the backend service writes numeric scores.

ALTER TABLE public.lesson_attempt_feedbacks
  ADD COLUMN IF NOT EXISTS content_score  FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed_score    FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emotion_score  FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_score  FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feedback_text  TEXT;
