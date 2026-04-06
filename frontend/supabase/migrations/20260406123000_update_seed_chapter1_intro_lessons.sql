-- Update seed data: Chapter 1 intro lessons (lessons only, no bossfight)
-- Purpose: apply edits after initial seed migration has already been executed.

DO $$
DECLARE
  v_chapter_id UUID;
BEGIN
  -- Find chapter by new title, old title, or first chapter slot.
  SELECT c.id
  INTO v_chapter_id
  FROM public.chapters c
  WHERE c.title IN (
    'BƯỚC ĐẦU TỰ TIN - GIỚI THIỆU BẢN THÂN',
    'CHƯƠNG 1: BƯỚC ĐẦU TỰ TIN - GIỚI THIỆU BẢN THÂN'
  )
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    SELECT c.id
    INTO v_chapter_id
    FROM public.chapters c
    WHERE c.order_index = 1
    ORDER BY c.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_chapter_id IS NULL THEN
    INSERT INTO public.chapters (
      title,
      description,
      order_index,
      boss_unlock_threshold,
      is_published
    )
    VALUES (
      'BƯỚC ĐẦU TỰ TIN - GIỚI THIỆU BẢN THÂN',
      'Mục tiêu: tự giới thiệu tự nhiên 60-90 giây, giảm lo lắng và xây dựng sự tự tin khi nói về bản thân.',
      1,
      80,
      true
    )
    RETURNING id INTO v_chapter_id;
  END IF;

  -- Normalize chapter metadata to latest content
  UPDATE public.chapters
  SET
    title = 'BƯỚC ĐẦU TỰ TIN - GIỚI THIỆU BẢN THÂN',
    description = 'Mục tiêu: tự giới thiệu tự nhiên 60-90 giây, giảm lo lắng và xây dựng sự tự tin khi nói về bản thân.',
    order_index = 1,
    boss_unlock_threshold = 80,
    is_published = true
  WHERE id = v_chapter_id;

  -- Lesson 1 (update if exists, otherwise insert)
  UPDATE public.lessons
  SET
    title = 'CẢNH 1: Tại sao tự giới thiệu lại khó đến vậy?',
    video_url = NULL,
    video_duration = 45,
    action_prompt = 'Hãy giới thiệu tên của bạn, trường bạn đang học, và một sở thích bạn yêu thích. Chỉ 3 câu, thời lượng 20-30 giây. Nói như đang trò chuyện với một người bạn mới.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 1;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE chapter_id = v_chapter_id AND order_index = 1
  ) THEN
    INSERT INTO public.lessons (
      chapter_id, title, video_url, video_duration, action_prompt, order_index, is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 1: Tại sao tự giới thiệu lại khó đến vậy?',
      NULL,
      45,
      'Hãy giới thiệu tên của bạn, trường bạn đang học, và một sở thích bạn yêu thích. Chỉ 3 câu, thời lượng 20-30 giây. Nói như đang trò chuyện với một người bạn mới.',
      1,
      true
    );
  END IF;

  -- Lesson 2
  UPDATE public.lessons
  SET
    title = 'CẢNH 2: Công thức 3P - Quá khứ, Hiện tại, Tương lai',
    video_url = NULL,
    video_duration = 55,
    action_prompt = 'Tự giới thiệu theo công thức 3P: (1) Past - một trải nghiệm đã định hình bạn, (2) Present - hiện tại bạn đang học/làm gì, (3) Plan - mục tiêu/cơ hội bạn đang hướng tới. Thời lượng 45-60 giây.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 2;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE chapter_id = v_chapter_id AND order_index = 2
  ) THEN
    INSERT INTO public.lessons (
      chapter_id, title, video_url, video_duration, action_prompt, order_index, is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 2: Công thức 3P - Quá khứ, Hiện tại, Tương lai',
      NULL,
      55,
      'Tự giới thiệu theo công thức 3P: (1) Past - một trải nghiệm đã định hình bạn, (2) Present - hiện tại bạn đang học/làm gì, (3) Plan - mục tiêu/cơ hội bạn đang hướng tới. Thời lượng 45-60 giây.',
      2,
      true
    );
  END IF;

  -- Lesson 3
  UPDATE public.lessons
  SET
    title = 'CẢNH 3: Thêm chất vào câu chuyện - Hook & Uniqueness',
    video_url = NULL,
    video_duration = 60,
    action_prompt = 'Giới thiệu lại bản thân với: Hook mở đầu thu hút + khung 3P + điểm Uniqueness (điều làm bạn khác biệt). Thời lượng 60-75 giây.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 3;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE chapter_id = v_chapter_id AND order_index = 3
  ) THEN
    INSERT INTO public.lessons (
      chapter_id, title, video_url, video_duration, action_prompt, order_index, is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 3: Thêm chất vào câu chuyện - Hook & Uniqueness',
      NULL,
      60,
      'Giới thiệu lại bản thân với: Hook mở đầu thu hút + khung 3P + điểm Uniqueness (điều làm bạn khác biệt). Thời lượng 60-75 giây.',
      3,
      true
    );
  END IF;

  -- Lesson 4
  UPDATE public.lessons
  SET
    title = 'CẢNH 4: Xử lý cảm xúc - Nói chậm lại khi hồi hộp',
    video_url = NULL,
    video_duration = 50,
    action_prompt = 'Tự giới thiệu (Hook + 3P + Uniqueness) và tập trung kiểm soát nhịp độ: hít thở sâu 2-3 giây trước khi nói, có ít nhất 2 khoảng lặng 1-2 giây giữa các ý. Thời lượng 70-90 giây.',
    is_published = true
  WHERE chapter_id = v_chapter_id AND order_index = 4;

  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE chapter_id = v_chapter_id AND order_index = 4
  ) THEN
    INSERT INTO public.lessons (
      chapter_id, title, video_url, video_duration, action_prompt, order_index, is_published
    )
    VALUES (
      v_chapter_id,
      'CẢNH 4: Xử lý cảm xúc - Nói chậm lại khi hồi hộp',
      NULL,
      50,
      'Tự giới thiệu (Hook + 3P + Uniqueness) và tập trung kiểm soát nhịp độ: hít thở sâu 2-3 giây trước khi nói, có ít nhất 2 khoảng lặng 1-2 giây giữa các ý. Thời lượng 70-90 giây.',
      4,
      true
    );
  END IF;
END $$;

