-- Seed data: Chapter 2 (Storytelling) - lessons only, no bossfight
-- Idempotent: update if exists, otherwise insert.

DO $$
DECLARE
  v_chapter_id UUID;
BEGIN
  -- 1) Ensure chapter exists (match exact title)
  SELECT c.id
  INTO v_chapter_id
  FROM public.chapters c
  WHERE c.title = 'KỂ CHUYỆN CỦA MÌNH'
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    INSERT INTO public.chapters (
      title,
      description,
      order_index,
      boss_unlock_threshold,
      is_published
    )
    VALUES (
      'KỂ CHUYỆN CỦA MÌNH',
      'Mục tiêu: biến trải nghiệm đời thường thành câu chuyện hấp dẫn, có cấu trúc và có cảm xúc thật khi phỏng vấn.',
      2,
      80,
      true
    )
    RETURNING id INTO v_chapter_id;
  END IF;

  -- Normalize chapter metadata
  UPDATE public.chapters
  SET
    description = 'Mục tiêu: biến trải nghiệm đời thường thành câu chuyện hấp dẫn, có cấu trúc và có cảm xúc thật khi phỏng vấn.',
    order_index = 2,
    boss_unlock_threshold = 80,
    is_published = true
  WHERE id = v_chapter_id;

  -- 2) Lesson 1 - Why storytelling matters
  UPDATE public.lessons
  SET
    title = 'CẢNH 1: Tại sao kể chuyện lại quan trọng?',
    video_url = NULL,
    video_duration = 45,
    action_prompt = 'Chọn 1 trải nghiệm nhỏ gần đây (làm bài nhóm/hoạt động CLB). Kể theo 4 ý: gặp tình huống gì, bạn làm gì, kết quả ra sao, và bài học bạn rút ra. Thời lượng khoảng 40-55 giây.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 1;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons
    WHERE chapter_id = v_chapter_id AND order_index = 1
  ) THEN
    INSERT INTO public.lessons (
      chapter_id,
      title,
      video_url,
      video_duration,
      action_prompt,
      order_index,
      is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 1: Tại sao kể chuyện lại quan trọng?',
      NULL,
      45,
      'Chọn 1 trải nghiệm nhỏ gần đây (làm bài nhóm/hoạt động CLB). Kể theo 4 ý: gặp tình huống gì, bạn làm gì, kết quả ra sao, và bài học bạn rút ra. Thời lượng khoảng 40-55 giây.',
      1,
      true
    );
  END IF;

  -- 3) Lesson 2 - STAR framework
  UPDATE public.lessons
  SET
    title = 'CẢNH 2: Công thức STAR (Situation - Task - Action - Result)',
    video_url = NULL,
    video_duration = 60,
    action_prompt = 'Chọn 1 tình huống học tập/hoạt động gần đây. Kể theo STAR: Situation (hoàn cảnh) → Task (nhiệm vụ) → Action (bạn làm cụ thể gì) → Result (kết quả + điều bạn học). Nhớ nói rõ phần Action. Thời lượng 60 giây.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 2;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons
    WHERE chapter_id = v_chapter_id AND order_index = 2
  ) THEN
    INSERT INTO public.lessons (
      chapter_id,
      title,
      video_url,
      video_duration,
      action_prompt,
      order_index,
      is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 2: Công thức STAR (Situation - Task - Action - Result)',
      NULL,
      60,
      'Chọn 1 tình huống học tập/hoạt động gần đây. Kể theo STAR: Situation (hoàn cảnh) → Task (nhiệm vụ) → Action (bạn làm cụ thể gì) → Result (kết quả + điều bạn học). Nhớ nói rõ phần Action. Thời lượng 60 giây.',
      2,
      true
    );
  END IF;

  -- 4) Lesson 3 - Turn failure into learning
  UPDATE public.lessons
  SET
    title = 'CẢNH 3: Biến thất bại thành bài học (kể theo STAR)',
    video_url = NULL,
    video_duration = 55,
    action_prompt = 'Kể 1 lần bạn thất bại hoặc làm chưa tốt. Dùng STAR nhưng tập trung vào Result: kết quả ra sao và bạn đã học được gì. Sau đó nói thêm 1 thay đổi bạn sẽ làm lần sau. Thời lượng khoảng 50-60 giây.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 3;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons
    WHERE chapter_id = v_chapter_id AND order_index = 3
  ) THEN
    INSERT INTO public.lessons (
      chapter_id,
      title,
      video_url,
      video_duration,
      action_prompt,
      order_index,
      is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 3: Biến thất bại thành bài học (kể theo STAR)',
      NULL,
      55,
      'Kể 1 lần bạn thất bại hoặc làm chưa tốt. Dùng STAR nhưng tập trung vào Result: kết quả ra sao và bạn đã học được gì. Sau đó nói thêm 1 thay đổi bạn sẽ làm lần sau. Thời lượng khoảng 50-60 giây.',
      3,
      true
    );
  END IF;

  -- 5) Lesson 4 - Emotional storytelling
  UPDATE public.lessons
  SET
    title = 'CẢNH 4: Kể chuyện có cảm xúc (để người nghe “cảm” được)',
    video_url = NULL,
    video_duration = 55,
    action_prompt = 'Kể lại 1 khoảnh khắc khiến bạn thật sự xúc động hoặc cười thật lòng. Thêm 1 chi tiết nhỏ tạo hình ảnh, nói rõ bạn đã cảm thấy thế nào lúc đó, và kết thúc bằng điều bạn nhận ra. Thời lượng khoảng 50-60 giây.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 4;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons
    WHERE chapter_id = v_chapter_id AND order_index = 4
  ) THEN
    INSERT INTO public.lessons (
      chapter_id,
      title,
      video_url,
      video_duration,
      action_prompt,
      order_index,
      is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 4: Kể chuyện có cảm xúc (để người nghe “cảm” được)',
      NULL,
      55,
      'Kể lại 1 khoảnh khắc khiến bạn thật sự xúc động hoặc cười thật lòng. Thêm 1 chi tiết nhỏ tạo hình ảnh, nói rõ bạn đã cảm thấy thế nào lúc đó, và kết thúc bằng điều bạn nhận ra. Thời lượng khoảng 50-60 giây.',
      4,
      true
    );
  END IF;
END $$;

