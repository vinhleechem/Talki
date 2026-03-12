import { apiFetch } from "./api";
import type { Chapter, LessonAttemptFeedback, LessonAttemptFeedbackCreate, LessonCompleteResponse } from "@/types";

export const lessonService = {
  /** Fetch all chapters, lessons, and boss unlock status */
  getChapters(): Promise<Chapter[]> {
    return apiFetch<Chapter[]>("/lessons/chapters");
  },

  /** Mark a lesson as completed. Returns any newly unlocked achievements. */
  completeLesson(lessonId: string, watchPercent = 100): Promise<LessonCompleteResponse> {
    return apiFetch<LessonCompleteResponse>(`/lessons/lessons/${lessonId}/complete`, {
      method: "POST",
      body: JSON.stringify({ watch_percent: watchPercent }),
    });
  },

  /** Submit AI feedback scores for a lesson action attempt */
  submitFeedback(lessonId: string, data: LessonAttemptFeedbackCreate): Promise<LessonAttemptFeedback> {
    return apiFetch<LessonAttemptFeedback>(`/lessons/lessons/${lessonId}/feedback`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** Get all previous feedback attempts for a lesson */
  getFeedbacks(lessonId: string): Promise<LessonAttemptFeedback[]> {
    return apiFetch<LessonAttemptFeedback[]>(`/lessons/lessons/${lessonId}/feedback`);
  },
};
