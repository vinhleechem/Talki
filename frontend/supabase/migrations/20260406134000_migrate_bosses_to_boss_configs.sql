-- Migrate roadmap boss source from public.bosses -> public.boss_configs
-- Keep compatibility with existing "friend-style" schema (no is_published column in boss_configs).

-- 1) Ensure required column exists on boss_configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='boss_configs' AND column_name='chapter_id'
  ) THEN
    ALTER TABLE public.boss_configs ADD COLUMN chapter_id UUID;
  END IF;
END $$;

-- 2) Backfill chapter_id from legacy target_id when possible
-- target_id might store chapter UUID text
UPDATE public.boss_configs bc
SET chapter_id = c.id
FROM public.chapters c
WHERE bc.chapter_id IS NULL
  AND bc.target_id ~* '^[0-9a-f-]{36}$'
  AND c.id::text = bc.target_id;

-- target_id might store chapter title
UPDATE public.boss_configs bc
SET chapter_id = c.id
FROM public.chapters c
WHERE bc.chapter_id IS NULL
  AND lower(coalesce(bc.target_id, '')) = lower(c.title);

-- 3) Migrate data from public.bosses into public.boss_configs for chapters missing config
INSERT INTO public.boss_configs (chapter_id, scenarios, personalities, avatar_url)
SELECT
  b.chapter_id,
  jsonb_build_array(
    jsonb_build_object(
      'title', coalesce(nullif(b.name, ''), 'Boss Fight'),
      'context', coalesce(nullif(b.mission_prompt, ''), 'Hoàn thành thử thách giao tiếp theo chapter'),
      'greeting_opener', 'Chào bạn, chúng ta bắt đầu Boss Fight nhé!'
    )
  ) as scenarios,
  jsonb_build_array(
    jsonb_build_object(
      'eng_key', coalesce(nullif(b.gender, ''), 'neutral'),
      'vi_display', coalesce(nullif(b.name, ''), 'Boss')
    )
  ) as personalities,
  b.avatar_url
FROM public.bosses b
WHERE NOT EXISTS (
  SELECT 1
  FROM public.boss_configs bc
  WHERE bc.chapter_id = b.chapter_id
);

-- 4) Remove rows that still cannot be mapped to any chapter (e.g. default placeholders)
DELETE FROM public.boss_configs
WHERE chapter_id IS NULL;

-- 5) Enforce 1:1 chapter <-> boss_config
DO $$
BEGIN
  -- remove duplicate chapter rows, keep newest
  DELETE FROM public.boss_configs x
  USING public.boss_configs y
  WHERE x.chapter_id = y.chapter_id
    AND x.id <> y.id
    AND coalesce(x.updated_at, x.created_at, now()) < coalesce(y.updated_at, y.created_at, now());
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'boss_configs'
      AND indexname = 'boss_configs_chapter_id_key'
  ) THEN
    CREATE UNIQUE INDEX boss_configs_chapter_id_key ON public.boss_configs (chapter_id);
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.boss_configs
    ALTER COLUMN chapter_id SET NOT NULL;
EXCEPTION
  WHEN others THEN
    -- Keep migration non-blocking if environment still has edge-case bad rows.
    RAISE NOTICE 'Could not set chapter_id NOT NULL on boss_configs: %', SQLERRM;
END $$;

