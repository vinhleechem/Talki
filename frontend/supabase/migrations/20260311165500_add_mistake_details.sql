-- Migration to add detailed mistake tracking to user_mistakes

-- 1. Thêm các cột phân loại lỗi và cách sửa vào bảng user_mistakes hiện tại
ALTER TABLE public.user_mistakes
ADD COLUMN IF NOT EXISTS mistake_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS correction TEXT;

-- (Optional) Mở rộng độ dài của word_or_phrase nếu trước đây để quá ngắn
ALTER TABLE public.user_mistakes
ALTER COLUMN word_or_phrase TYPE VARCHAR(255);

-- 2. Đổi index. Đảm bảo 1 user chỉ có 1 dòng đại diện cho 1 lỗi cụ thể (để Upsert)
-- Xoá những cái trùng lặp nếu có trước khi tạo Unique Constraint
DELETE FROM public.user_mistakes a USING (
    SELECT MIN(ctid) as ctid, user_id, word_or_phrase
    FROM public.user_mistakes 
    GROUP BY user_id, word_or_phrase HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id 
AND a.word_or_phrase = b.word_or_phrase 
AND a.ctid <> b.ctid;

-- Tạo unique constraint để an toàn cho việc Upsert
ALTER TABLE public.user_mistakes
DROP CONSTRAINT IF EXISTS unique_user_mistake;

ALTER TABLE public.user_mistakes
ADD CONSTRAINT unique_user_mistake UNIQUE (user_id, word_or_phrase);

-- Bật RLS và policies (dù bảng này đã có từ v2.1 nhưng đảm bảo lại)
ALTER TABLE public.user_mistakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_mistakes_select_own" ON public.user_mistakes;
CREATE POLICY "user_mistakes_select_own" ON public.user_mistakes FOR SELECT USING (auth.uid() = user_id);
-- Cho phép user sửa (mặc dù backend nên thao tác qua service_role)
DROP POLICY IF EXISTS "user_mistakes_update_own" ON public.user_mistakes;
CREATE POLICY "user_mistakes_update_own" ON public.user_mistakes FOR UPDATE USING (auth.uid() = user_id);
