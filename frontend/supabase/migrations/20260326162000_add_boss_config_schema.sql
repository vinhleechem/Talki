-- Supabase SQL migration: Boss Fight schema
-- Run this in Supabase SQL Editor

-- ── BossConfig table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.boss_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id TEXT NOT NULL,               -- Stage or Lesson name
    config_type TEXT NOT NULL DEFAULT 'stage', -- 'stage' | 'lesson' | 'default'
    scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    personalities JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed a default fallback config
INSERT INTO public.boss_configs (target_id, config_type, scenarios, personalities)
VALUES (
    'default',
    'default',
    '["Bạn gặp một tình huống giao tiếp thực tế cần xử lý một cách tự nhiên và tự tin."]'::jsonb,
    '["neutral and professional - người đối diện lịch sự và chuyên nghiệp"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Seed Giao tiếp cơ bản stage config
INSERT INTO public.boss_configs (target_id, config_type, scenarios, personalities)
VALUES (
    'Giao tiếp cơ bản',
    'stage',
    '["Bạn đang tham dự một workshop về tài chính và bất ngờ gặp lại người bạn cũ ngồi cạnh. Hãy bắt đầu cuộc trò chuyện.", "Bạn vừa chuyển đến khu phố mới và gặp hàng xóm lần đầu. Hãy làm quen.", "Bạn gặp người lạ tò mò hỏi về công việc của bạn. Hãy trả lời và giữ cuộc trò chuyện thú vị."]'::jsonb,
    '["friendly and enthusiastic - người bạn cũ vui vẻ hay hỏi thăm", "curious and talkative - hàng xóm tọc mạch nhưng tốt bụng", "reserved but polite - người lạ lịch sự nhưng hơi dè dặt"]'::jsonb
);

-- ── BossSession table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.boss_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    boss_config_id UUID REFERENCES public.boss_configs(id) ON DELETE SET NULL,
    scenario TEXT NOT NULL,
    personality TEXT NOT NULL,
    conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    turn_count INTEGER NOT NULL DEFAULT 0,
    max_turns INTEGER NOT NULL DEFAULT 7,
    user_hp INTEGER NOT NULL DEFAULT 100,
    boss_hp INTEGER NOT NULL DEFAULT 100,
    pass_score INTEGER NOT NULL DEFAULT 60,
    final_score INTEGER,
    feedback TEXT,
    passed BOOLEAN,
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.boss_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_sessions ENABLE ROW LEVEL SECURITY;

-- BossConfig: anyone authenticated can read, only service_role can write
CREATE POLICY "boss_configs_select" ON public.boss_configs FOR SELECT USING (true);

-- BossSession: users can only read their own sessions
CREATE POLICY "boss_sessions_select_own" ON public.boss_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access (bypasses RLS)

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_boss_configs_target_id ON public.boss_configs(target_id, config_type);
CREATE INDEX IF NOT EXISTS idx_boss_sessions_user_id ON public.boss_sessions(user_id);
