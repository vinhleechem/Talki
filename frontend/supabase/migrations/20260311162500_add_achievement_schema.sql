-- Migration to add achievements and track user progress stats

-- 1. Thêm các cột theo dõi hệ thống (progress tracking) vào bảng users hiện tại
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- 2. Tạo bảng achievements (danh mục thành tựu)
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon_url VARCHAR(255),
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bật RLS và cấp quyền cho phép User mọi quyền Select
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_select_all" ON public.achievements;
CREATE POLICY "achievements_select_all" ON public.achievements FOR SELECT USING (true);


-- 3. Tạo bảng user_achievements (ghi nhận user unlock)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id) -- User chỉ unlock 1 achievement một lần
);

-- Bật RLS cho bảng user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
CREATE POLICY "user_achievements_select_own" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Lưu ý: Backend Service Role (môi trường server có SUPABASE_SERVICE_ROLE_KEY) sẽ bỏ qua RLS và có thể insert.

-- 4. Seed dữ liệu mặc định (Optional - Tuỳ chọn một số data gốc)
INSERT INTO public.achievements (code, name, description, icon_url, condition_type, condition_value)
VALUES 
  ('streak_7_days', 'Chiến Binh Bền Bỉ', 'Đăng nhập liên tục 7 ngày.', 'https://img.icons8.com/color/96/diamond.png', 'streak', 7),
  ('scenes_completed_10', 'Người Tiên Phong', 'Hoàn thành 10 cảnh luyện tập.', 'https://img.icons8.com/color/96/medal2.png', 'scenes_completed', 10),
  ('stars_collected_50', 'Bậc Thầy Ngôn Từ', 'Thu thập đủ 50 sao.', 'https://img.icons8.com/color/96/star.png', 'total_stars', 50)
ON CONFLICT (code) DO NOTHING;
