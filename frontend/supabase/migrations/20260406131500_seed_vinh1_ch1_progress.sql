-- Seed progress for specific user: vinh1@gmail.com
-- Goal: user completes Chapter 1 lessons with score >= 60 to unlock Boss Fight.

DO $$
DECLARE
  v_user_id UUID;
  v_chapter_id UUID;
  v_lesson RECORD;
  v_attempt_no INT;
BEGIN
  -- Find exact user by email (prefer public.users.email, fallback auth.users.email)
  SELECT u.id
  INTO v_user_id
  FROM public.users u
  WHERE lower(u.email) = 'vinh1@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT a.id
    INTO v_user_id
    FROM auth.users a
    WHERE lower(a.email) = 'vinh1@gmail.com'
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '[seed_vinh1_ch1] User vinh1@gmail.com not found. Skip.';
    RETURN;
  END IF;

  -- Ensure public.users row exists for that auth user
  INSERT INTO public.users (id, display_name, email)
  VALUES (v_user_id, 'vinh1', 'vinh1@gmail.com')
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(public.users.email, EXCLUDED.email);

  -- Find chapter 1
  SELECT c.id
  INTO v_chapter_id
  FROM public.chapters c
  WHERE c.title ILIKE '%BƯỚC ĐẦU TỰ TIN - GIỚI THIỆU BẢN THÂN%'
  ORDER BY c.order_index, c.created_at
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    RAISE NOTICE '[seed_vinh1_ch1] Chapter 1 not found. Skip.';
    RETURN;
  END IF;

  FOR v_lesson IN
    SELECT l.id, l.title, l.order_index
    FROM public.lessons l
    WHERE l.chapter_id = v_chapter_id
      AND l.is_published = true
    ORDER BY l.order_index
  LOOP
    -- Mark lesson progress as completed with passing score
    INSERT INTO public.user_lesson_progress (
      user_id,
      lesson_id,
      watched,
      watch_percent,
      stars,
      attempts,
      best_score,
      completed,
      transcript,
      completed_at
    )
    VALUES (
      v_user_id,
      v_lesson.id,
      true,
      100,
      4,
      1,
      85,
      true,
      format('SEED_VINH1_CH1_L%s: Tôi tự giới thiệu mạch lạc, rõ ràng và tự tin cho bài "%s".', v_lesson.order_index, v_lesson.title),
      now()
    )
    ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET
      watched = true,
      watch_percent = GREATEST(public.user_lesson_progress.watch_percent, 100),
      stars = GREATEST(public.user_lesson_progress.stars, 4),
      attempts = GREATEST(public.user_lesson_progress.attempts, 1),
      best_score = GREATEST(public.user_lesson_progress.best_score, 85),
      completed = true,
      transcript = EXCLUDED.transcript,
      completed_at = COALESCE(public.user_lesson_progress.completed_at, now());

    -- Add one attempt feedback if user has no attempt for this lesson
    IF NOT EXISTS (
      SELECT 1
      FROM public.lesson_attempt_feedbacks f
      WHERE f.user_id = v_user_id
        AND f.lesson_id = v_lesson.id
    ) THEN
      SELECT COALESCE(MAX(f.attempt_number), 0) + 1
      INTO v_attempt_no
      FROM public.lesson_attempt_feedbacks f
      WHERE f.user_id = v_user_id
        AND f.lesson_id = v_lesson.id;

      INSERT INTO public.lesson_attempt_feedbacks (
        user_id,
        lesson_id,
        attempt_number,
        transcript,
        stars,
        content_feedback,
        speed_feedback,
        emotion_feedback,
        advice_text,
        filler_word_count,
        content_score,
        speed_score,
        emotion_score,
        overall_score,
        feedback_text,
        mistakes
      )
      VALUES (
        v_user_id,
        v_lesson.id,
        v_attempt_no,
        format('SEED_VINH1_CH1_L%s: Xin chào, tôi là Vinh. Tôi trình bày rõ ràng và đúng cấu trúc yêu cầu.', v_lesson.order_index),
        4,
        'Nội dung đúng trọng tâm, đầy đủ ý.',
        'Tốc độ ổn định.',
        'Giọng điệu tự tin.',
        'Giữ phong độ và thêm ví dụ thực tế để ấn tượng hơn.',
        1,
        8.5,
        8.2,
        8.6,
        85,
        'Đạt yêu cầu mở khóa boss.',
        '[]'::jsonb
      );
    END IF;
  END LOOP;
END $$;

