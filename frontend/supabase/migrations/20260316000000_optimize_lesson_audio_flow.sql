-- Migration: Add missing fields for Lesson Audio Flow Optimization
-- Description: Adds 'mistakes' to lesson_attempt_feedbacks and 'correction' to user_mistakes.

-- 1. Update lesson_attempt_feedbacks table
-- This field stores the detailed JSON analysis of mistakes for a specific attempt.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='lesson_attempt_feedbacks' AND column_name='mistakes') THEN
        ALTER TABLE public.lesson_attempt_feedbacks ADD COLUMN mistakes JSONB DEFAULT '[]';
    END IF;
END $$;

-- 2. Update user_mistakes table
-- This field stores the AI-suggested correction for the recognized mistake.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='user_mistakes' AND column_name='correction') THEN
        ALTER TABLE public.user_mistakes ADD COLUMN correction TEXT;
    END IF;
END $$;

-- 3. Ensure other critical fields for Scorecard exist
DO $$ 
BEGIN 
    -- Ensure overall_score exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='lesson_attempt_feedbacks' AND column_name='overall_score') THEN
        ALTER TABLE public.lesson_attempt_feedbacks ADD COLUMN overall_score FLOAT DEFAULT 0.0;
    END IF;

    -- Ensure transcript exists for feedback
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='lesson_attempt_feedbacks' AND column_name='transcript') THEN
        ALTER TABLE public.lesson_attempt_feedbacks ADD COLUMN transcript TEXT;
    END IF;
END $$;
