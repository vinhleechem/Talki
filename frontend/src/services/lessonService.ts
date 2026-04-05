import { apiFetch } from "./api";
import type { Chapter, LessonAttemptFeedback, LessonAttemptHistoryItem, LessonCompleteResponse } from "@/types";

export const lessonService = {
  getChapters(): Promise<Chapter[]> {
    return apiFetch<Chapter[]>("/lessons/chapters");
  },

  completeLesson(lessonId: string, watchPercent = 100): Promise<LessonCompleteResponse> {
    return apiFetch<LessonCompleteResponse>(`/lessons/${lessonId}/complete`, {
      method: "POST",
      body: JSON.stringify({ watch_percent: watchPercent }),
    });
  },

  submitAudioPractice(lessonId: string, audioBlob: Blob): Promise<LessonAttemptFeedback> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "practice.webm");
    return apiFetch<LessonAttemptFeedback>(`/lessons/${lessonId}/submit`, {
      method: "POST",
      body: formData,
    });
  },

  /** Toàn bộ lịch sử luyện tập của user (kèm tên bài/chương) */
  getMyHistory(): Promise<LessonAttemptHistoryItem[]> {
    return apiFetch<LessonAttemptHistoryItem[]>("/lessons/my-history");
  },

  /** Lịch sử luyện tập của user cho một bài học cụ thể */
  getLessonFeedbacks(lessonId: string): Promise<LessonAttemptFeedback[]> {
    return apiFetch<LessonAttemptFeedback[]>(`/lessons/${lessonId}/feedback`);
  },
};
