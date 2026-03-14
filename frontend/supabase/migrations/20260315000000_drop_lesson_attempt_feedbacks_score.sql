-- Bỏ cột trùng: chỉ dùng overall_score (0-100); API trả score = round(overall_score) cho FE.
-- Chạy migration này SAU khi đã cập nhật hết code backend đọc/ghi (model không còn score).

ALTER TABLE public.lesson_attempt_feedbacks
  DROP COLUMN IF EXISTS score;
