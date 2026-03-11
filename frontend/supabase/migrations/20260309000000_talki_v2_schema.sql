-- =============================================================
-- TALKI v2.1 – Full Schema Migration
-- Ngày: 09/03/2026
-- =============================================================

-- -------------------------------------------------------------
-- HELPER: auto-update updated_at (dùng lại nếu chưa có)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- =============================================================
-- 1. USERS
--    Mở rộng thông tin người dùng ngoài auth.users
-- =============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,

  -- Hệ thống Năng lượng (Energy)
  energy              INTEGER NOT NULL DEFAULT 3,   -- số năng lượng hiện tại
  max_energy          INTEGER NOT NULL DEFAULT 3,   -- giới hạn theo gói (3 / 20 / 999)
  last_energy_refill  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Role
  role                TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin')),

  -- Gói cước
  plan                TEXT NOT NULL DEFAULT 'free'  -- 'free' | 'monthly' | 'yearly'
    CHECK (plan IN ('free', 'monthly', 'yearly')),
  plan_expires_at     TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_select_own" ON public.users;
DROP POLICY IF EXISTS "user_update_own" ON public.users;
CREATE POLICY "user_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Tự động tạo row trong public.users khi có user mới đăng ký Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================
-- 2. LEARNING MAP: chapters → lessons → bosses
--    (Level và Chapter gộp làm 1 cấp = "chapter" theo SRS v2.1)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.chapters (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   TEXT NOT NULL,
  description             TEXT,
  thumbnail_url           TEXT,
  order_index             INTEGER NOT NULL DEFAULT 0,
  -- % hoàn thành lesson cần để mở Boss Fight
  boss_unlock_threshold   INTEGER NOT NULL DEFAULT 80,  -- 80% mặc định
  is_published            BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_chapters_updated_at ON public.chapters;
CREATE TRIGGER trg_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chapters_select_all" ON public.chapters;
DROP POLICY IF EXISTS "chapters_modify_admin" ON public.chapters;
CREATE POLICY "chapters_select_all"  ON public.chapters FOR SELECT USING (is_published = true OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "chapters_modify_admin" ON public.chapters FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Lesson = 1 cảnh trong chapter (The Loop: Learn → Action → Feedback)
CREATE TABLE IF NOT EXISTS public.lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  -- Bước 1: Learn
  video_url       TEXT,                 -- video 30-60s từ Mentor thật
  video_duration  INTEGER DEFAULT 0,   -- giây
  -- Bước 2: Action – prompt/tình huống user phải xử lý
  action_prompt   TEXT,                -- ví dụ: "Tự giới thiệu bản thân trong 30 giây"
  -- Meta
  order_index     INTEGER NOT NULL DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_lessons_updated_at ON public.lessons;
CREATE TRIGGER trg_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_select_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_modify_admin" ON public.lessons;
CREATE POLICY "lessons_select_all"  ON public.lessons FOR SELECT USING (is_published = true OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "lessons_modify_admin" ON public.lessons FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Boss Fight – 1 boss / 1 chapter
CREATE TABLE IF NOT EXISTS public.bosses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      UUID NOT NULL UNIQUE REFERENCES public.chapters(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,       -- tên nhân vật, vd: "Trưởng phòng HR VinGroup"
  avatar_url      TEXT,
  -- Nhiệm vụ hiển thị cho người chơi trước khi vào fight
  mission_prompt  TEXT NOT NULL DEFAULT '', -- vd: "Bạn là ứng viên, hãy thuyết phục HR trong 5 lượt"
  -- System prompt định nghĩa persona + kịch bản cho AI
  persona_prompt  TEXT NOT NULL,
  gender          TEXT NOT NULL DEFAULT 'neutral' CHECK (gender IN ('male','female','neutral')),
  max_turns       INTEGER NOT NULL DEFAULT 5,  -- số lượt hội thoại
  -- Ngưỡng điểm để thắng (3/5 sao = 60%)
  pass_score      INTEGER NOT NULL DEFAULT 60, -- 0-100
  is_published    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_bosses_updated_at ON public.bosses;
CREATE TRIGGER trg_bosses_updated_at
BEFORE UPDATE ON public.bosses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bosses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bosses_select_all" ON public.bosses;
DROP POLICY IF EXISTS "bosses_modify_admin" ON public.bosses;
CREATE POLICY "bosses_select_all"  ON public.bosses FOR SELECT USING (is_published = true OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "bosses_modify_admin" ON public.bosses FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');


-- =============================================================
-- 3. USER LESSON PROGRESS
--    Theo dõi tiến độ từng bài học của từng user
--    → dùng để tính % mở khóa Boss Fight
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  -- Bước Learn
  watched         BOOLEAN NOT NULL DEFAULT false,
  watch_percent   INTEGER NOT NULL DEFAULT 0,   -- 0–100
  -- Bước Action + Feedback
  stars           INTEGER NOT NULL DEFAULT 0    -- 0–5 (cần >= 3 để "Đạt")
    CHECK (stars BETWEEN 0 AND 5),
  attempts        INTEGER NOT NULL DEFAULT 0,
  best_score      INTEGER NOT NULL DEFAULT 0,   -- 0–100
  completed       BOOLEAN NOT NULL DEFAULT false, -- true khi stars >= 3
  audio_url       TEXT,                         -- audio nộp lần cuối
  transcript      TEXT,                         -- transcript lần cuối
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

DROP TRIGGER IF EXISTS trg_user_lesson_progress_updated_at ON public.user_lesson_progress;
CREATE TRIGGER trg_user_lesson_progress_updated_at
BEFORE UPDATE ON public.user_lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ulp_all_own" ON public.user_lesson_progress;
CREATE POLICY "ulp_all_own" ON public.user_lesson_progress FOR ALL USING (auth.uid() = user_id);


-- =============================================================
-- 3b. LESSON ATTEMPT FEEDBACKS
--     AI feedback cho từng lần thực hành lẻ (The Loop: Action step)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.lesson_attempt_feedbacks (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id         uuid    NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  attempt_number    integer NOT NULL DEFAULT 1,
  -- Audio & transcript
  audio_url         text,                    -- Supabase Storage – lưu 3 ngày
  transcript        text,
  -- Kết quả
  stars             integer NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 5),
  score             integer NOT NULL DEFAULT 0, -- 0-100
  -- AI Feedback 3 chiều
  content_feedback  text,                    -- nhận xét nội dung
  speed_feedback    text,                    -- nhận xét tốc độ
  emotion_feedback  text,                    -- nhận xét cảm xúc
  advice_text       text,                    -- lời khuyên cụ thể
  filler_word_count integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_attempt_feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "laf_all_own" ON public.lesson_attempt_feedbacks;
CREATE POLICY "laf_all_own" ON public.lesson_attempt_feedbacks FOR ALL USING (auth.uid() = user_id);


-- =============================================================
-- 3c. USER CHAPTER PROGRESS
--     Cache tiến độ từng chương của user (dùng cho Roadmap)
--     Cập nhật mỗi khi user hoàn thành lesson / boss fight
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_chapter_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chapter_id          UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,

  -- Tiến độ lesson
  lessons_completed   INTEGER NOT NULL DEFAULT 0,   -- số lesson đã completed (stars >= 3)
  lessons_total       INTEGER NOT NULL DEFAULT 0,   -- tổng số lesson published trong chapter
  completion_pct      INTEGER NOT NULL DEFAULT 0    -- 0-100
    CHECK (completion_pct BETWEEN 0 AND 100),

  -- Kết quả Boss Fight (lần tốt nhất)
  boss_unlocked       BOOLEAN NOT NULL DEFAULT false,  -- true khi completion_pct >= boss_unlock_threshold
  boss_stars          INTEGER                          -- sao tốt nhất đã đạt, NULL nếu chưa thử
    CHECK (boss_stars IS NULL OR boss_stars BETWEEN 0 AND 5),
  boss_passed         BOOLEAN NOT NULL DEFAULT false,  -- true khi boss_stars >= 3

  -- Trạng thái chương
  is_unlocked         BOOLEAN NOT NULL DEFAULT false,  -- false = bị khóa (chưa beat boss chapter trước)

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);

DROP TRIGGER IF EXISTS trg_user_chapter_progress_updated_at ON public.user_chapter_progress;
CREATE TRIGGER trg_user_chapter_progress_updated_at
BEFORE UPDATE ON public.user_chapter_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_chapter_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ucp_all_own" ON public.user_chapter_progress;
CREATE POLICY "ucp_all_own" ON public.user_chapter_progress FOR ALL USING (auth.uid() = user_id);


-- =============================================================
-- 4. CONVERSATIONS (Boss Fight sessions)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  boss_id     UUID NOT NULL REFERENCES public.bosses(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  -- Kết quả cuối
  final_score INTEGER,         -- 0-100
  stars       INTEGER          -- 0-5
    CHECK (stars IS NULL OR stars BETWEEN 0 AND 5),
  passed      BOOLEAN,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_all_own" ON public.conversations;
CREATE POLICY "conv_all_own" ON public.conversations FOR ALL USING (auth.uid() = user_id);

-- Mỗi lượt hội thoại (turn-based, 10s countdown)
CREATE TABLE IF NOT EXISTS public.conversation_turns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  turn_index          INTEGER NOT NULL,
  -- Phía User
  user_audio_url      TEXT,
  user_transcript     TEXT,
  filler_word_count   INTEGER NOT NULL DEFAULT 0,
  response_time_ms    INTEGER,          -- thực tế dùng bao nhiêu ms trong 10s
  -- Phía AI Boss
  ai_reply_text       TEXT,
  ai_audio_url        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, turn_index)
);

ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ct_select_own" ON public.conversation_turns;
CREATE POLICY "ct_select_own" ON public.conversation_turns
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.conversations WHERE id = conversation_id)
  );

-- Scorecard sau mỗi Boss Fight
CREATE TABLE IF NOT EXISTS public.conversation_feedbacks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  -- Điểm thành phần (0-10)
  fluency_score       NUMERIC(4,1) NOT NULL DEFAULT 0,   -- độ trôi chảy
  confidence_score    NUMERIC(4,1) NOT NULL DEFAULT 0,   -- độ tự tin
  content_score       NUMERIC(4,1) NOT NULL DEFAULT 0,   -- nội dung trọng tâm
  -- Tổng hợp
  total_filler_words  INTEGER NOT NULL DEFAULT 0,
  summary_text        TEXT,
  advice_json         JSONB DEFAULT '[]'::jsonb,
  -- advice_json format: [{ "turn_index": 0, "advice": "..." }, ...]
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cf_select_own" ON public.conversation_feedbacks;
CREATE POLICY "cf_select_own" ON public.conversation_feedbacks
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.conversations WHERE id = conversation_id)
  );


-- =============================================================
-- 5. ENERGY LOGS
--    Lịch sử trừ / cộng năng lượng của user
-- =============================================================
CREATE TABLE IF NOT EXISTS public.energy_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Số lượng thay đổi: âm = tiêu thụ, dương = nạp lại
  delta       INTEGER NOT NULL,        -- vd: -1 (lesson), -3 (boss), +3 (daily refill)
  reason      TEXT NOT NULL,
  -- 'lesson_action'   → -1 thực hành lẻ
  -- 'boss_fight'      → -3 vào đánh boss
  -- 'daily_refill'    → +N hồi phục hàng ngày
  -- 'plan_upgrade'    → +N khi mua gói
  reference_id UUID,                   -- conversation_id hoặc lesson_id liên quan
  energy_after INTEGER NOT NULL,       -- năng lượng còn lại sau thay đổi
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "el_select_own" ON public.energy_logs;
CREATE POLICY "el_select_own" ON public.energy_logs FOR SELECT USING (auth.uid() = user_id);


-- =============================================================
-- 6. USER MISTAKES (Sổ tay lỗi)
--    Tổng hợp filler words từ tất cả các phiên luyện tập
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_mistakes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  word_or_phrase    TEXT NOT NULL,          -- vd: "kiểu như", "thì là mà"
  occurrence_count  INTEGER NOT NULL DEFAULT 1,
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_or_phrase)
);

ALTER TABLE public.user_mistakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "um_all_own" ON public.user_mistakes;
CREATE POLICY "um_all_own" ON public.user_mistakes FOR ALL USING (auth.uid() = user_id);


-- =============================================================
-- 7. PAYMENT ORDERS (đơn hàng PayOS)
--    Mỗi lần user bấm "Mua gói" tạo 1 record
-- =============================================================
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount_vnd      INTEGER NOT NULL,            -- 99000 | 999000
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  -- PayOS fields
  payos_order_id  TEXT UNIQUE,                 -- mã đơn bên PayOS
  payos_link      TEXT,                        -- link QR thanh toán
  webhook_data    JSONB,                        -- raw webhook data để audit
  -- Timestamps
  expires_at      TIMESTAMPTZ NOT NULL,         -- đơn hết hạn sau 15 phút
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_select_own" ON public.payment_orders;
DROP POLICY IF EXISTS "po_insert_own" ON public.payment_orders;
CREATE POLICY "po_select_own" ON public.payment_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "po_insert_own" ON public.payment_orders FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =============================================================
-- 8. SUBSCRIPTIONS (gói đang active)
--    Chỉ tạo khi payment_order chuyển sang 'paid'
-- =============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES public.payment_orders(id),  -- đơn hàng tạo ra gói này
  plan            TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount_vnd      INTEGER NOT NULL,            -- 99000 hoặc 999000
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sub_select_own" ON public.subscriptions;
CREATE POLICY "sub_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);


-- =============================================================
-- INDEX – tăng tốc các query thường dùng
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_lessons_chapter        ON public.lessons (chapter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ulp_user               ON public.user_lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_ulp_lesson             ON public.user_lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user     ON public.conversations (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_turns_conv        ON public.conversation_turns (conversation_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_energy_logs_user       ON public.energy_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_mistakes_user     ON public.user_mistakes (user_id, occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_laf_user_lesson        ON public.lesson_attempt_feedbacks (user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user    ON public.payment_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payos   ON public.payment_orders (payos_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user     ON public.subscriptions (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_ucp_user               ON public.user_chapter_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_ucp_chapter            ON public.user_chapter_progress (chapter_id);
