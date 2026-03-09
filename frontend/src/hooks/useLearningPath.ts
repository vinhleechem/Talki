import { useEffect, useState } from "react";
import { lessonService } from "@/services/lessonService";
import type { Level } from "@/types";

export function useLearningPath() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const data = await lessonService.getLevels();
      setLevels(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  const completeLesson = async (lessonId: string) => {
    await lessonService.completeLesson(lessonId);
    await fetchLevels(); // refresh unlock state
  };

  return { levels, loading, error, completeLesson, refresh: fetchLevels };
}
