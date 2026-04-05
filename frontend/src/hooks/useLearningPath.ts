import { useEffect, useState } from "react";
import { lessonService } from "@/services/lessonService";
import type { Chapter } from "@/types";

export function useLearningPath() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const data = await lessonService.getChapters();
      setChapters(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  const completeLesson = async (lessonId: string) => {
    await lessonService.completeLesson(lessonId);
    await fetchChapters(); // refresh unlock state
  };

  return { chapters, loading, error, completeLesson, refresh: fetchChapters };
}
