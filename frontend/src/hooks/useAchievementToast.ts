import { useToast } from "@/components/ui/use-toast";

/**
 * Returns a function that shows a trophy popup for each newly unlocked achievement.
 * Usage:
 *   const showAchievements = useAchievementToast();
 *   const result = await lessonService.completeLesson(lessonId);
 *   showAchievements(result.newly_unlocked_achievements);
 */
export function useAchievementToast() {
  const { toast } = useToast();

  return (achievements: string[]) => {
    achievements.forEach((name) => {
      toast({
        title: `🏆 Thành tựu mới!`,
        description: `Bạn vừa mở khóa: ${name}`,
        duration: 5000,
      });
    });
  };
}
