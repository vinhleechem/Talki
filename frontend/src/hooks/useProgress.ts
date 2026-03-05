import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ProgressData {
  stage_id: number;
  scene_id: number;
  completed: boolean;
  stars: number;
}

export const useProgress = () => {
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setProgress(data || []);
    } catch (error: any) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (stageId: number, sceneId: number, completed: boolean, stars: number = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if progress exists
      const { data: existing } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('stage_id', stageId)
        .eq('scene_id', sceneId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_progress')
          .update({ completed, stars })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            stage_id: stageId,
            scene_id: sceneId,
            completed,
            stars
          });

        if (error) throw error;
      }

      await fetchProgress();
      
      toast({
        title: "Progress saved!",
        description: completed ? "Great job! Keep going! 🎉" : "Progress updated",
      });

    } catch (error: any) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const isStageCompleted = (stageId: number, totalScenes: number): boolean => {
    const stageProgress = progress.filter(
      p => p.stage_id === stageId && p.completed
    );
    return stageProgress.length === totalScenes;
  };

  const isBossUnlocked = (stageId: number, totalScenes: number): boolean => {
    return isStageCompleted(stageId, totalScenes);
  };

  const checkBossPassed = async (stageId: number): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('boss_challenges')
        .select('passed')
        .eq('user_id', user.id)
        .eq('stage_id', stageId)
        .eq('passed', true)
        .single();

      return !!data;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  return {
    progress,
    loading,
    updateProgress,
    isStageCompleted,
    isBossUnlocked,
    checkBossPassed,
    refetch: fetchProgress
  };
};