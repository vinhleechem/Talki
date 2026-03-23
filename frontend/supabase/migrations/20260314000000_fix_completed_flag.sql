-- Fix: Synchronize completed flag with best_score for data consistency
-- Ensure all lessons with best_score >= 60 have completed = true

UPDATE public.user_lesson_progress
SET completed = true,
    completed_at = completed_at OR now()
WHERE best_score >= 60 AND completed = false;

-- Log the changes made
SELECT 
  COUNT(*) as records_fixed,
  'user_lesson_progress' as affected_table
FROM public.user_lesson_progress
WHERE best_score >= 60 AND completed = true;
