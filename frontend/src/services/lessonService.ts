import { apiFetch } from "./api";
import type { Level } from "@/types";

export const lessonService = {
  /** Fetch all levels with chapters, lessons, and boss unlock status */
  getLevels(): Promise<Level[]> {
    return apiFetch<Level[]>("/lessons/levels");
  },

  /** Mark a lesson as completed */
  completeLesson(lessonId: string, watchPercent = 100): Promise<void> {
    return apiFetch(`/lessons/lessons/${lessonId}/complete`, {
      method: "POST",
      body: JSON.stringify({ watch_percent: watchPercent }),
    });
  },
};
