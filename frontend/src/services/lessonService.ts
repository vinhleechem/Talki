import { apiFetch } from "./api";
import type { Chapter, LessonAttemptFeedback, LessonAttemptFeedbackCreate, LessonCompleteResponse } from "@/types";

export const lessonService = {
  /** Fetch all chapters, lessons, and boss unlock status */
  getChapters(): Promise<Chapter[]> {
    return apiFetch<Chapter[]>("/lessons/chapters");
  },

  /** Mark a lesson as completed. Returns any newly unlocked achievements. */
  completeLesson(lessonId: string, watchPercent = 100): Promise<LessonCompleteResponse> {
    return apiFetch<LessonCompleteResponse>(`/lessons/${lessonId}/complete`, {
      method: "POST",
      body: JSON.stringify({ watch_percent: watchPercent }),
    });
  },

  /** Submit AI feedback scores for a lesson action attempt */
  submitFeedback(lessonId: string, data: LessonAttemptFeedbackCreate): Promise<LessonAttemptFeedback> {
    return apiFetch<LessonAttemptFeedback>(`/lessons/${lessonId}/feedback`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** Submit an audio file for AI evaluation of a lesson practice */
  submitAudioPractice(lessonId: string, audioBlob: Blob): Promise<LessonAttemptFeedback> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "practice.webm");

    // Can't use apiFetch directly because of FormData content-type issues in some implementations
    // So we use standard fetch or update apiFetch if it supports FormData. Let's use apiFetch since it handles auth.
    return apiFetch<LessonAttemptFeedback>(`/lessons/${lessonId}/practice`, {
      method: "POST",
      body: formData, // the Fetch API automatically sets multipart/form-data with boundaries when body is FormData
    });
  },

  /** Get all previous feedback attempts for a lesson */
  getFeedbacks(lessonId: string): Promise<LessonAttemptFeedback[]> {
    return apiFetch<LessonAttemptFeedback[]>(`/lessons/${lessonId}/feedback`);
  },
};
