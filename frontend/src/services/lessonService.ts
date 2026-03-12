import { apiFetch } from "./api";
import type { Chapter } from "@/types";

export const lessonService = {
  /** Fetch all chapters, lessons, and boss unlock status */
  getChapters(): Promise<Chapter[]> {
    return apiFetch<Chapter[]>("/lessons/chapters");
  },

  /** Mark a lesson as completed */
  completeLesson(lessonId: string, watchPercent = 100): Promise<void> {
    return apiFetch(`/lessons/lessons/${lessonId}/complete`, {
      method: "POST",
      body: JSON.stringify({ watch_percent: watchPercent }),
    });
  },
};
