import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Star, Lock, Check, Skull, User } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { lessonService } from "@/services/lessonService";
import type { Chapter } from "@/types";
import Navbar from "@/components/Navbar";

const RoadMap = () => {
  const navigate = useNavigate();
  const { profile, hearts } = useUser();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const data = await lessonService.getChapters();
        setChapters(data);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu bài học", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, []);

  const isLessonUnlocked = (
    chapterIndex: number,
    lessonIndex: number,
  ): boolean => {
    // Luôn mở khóa bài đầu tiên của chapter đầu tiên
    if (chapterIndex === 0 && lessonIndex === 0) return true;

    // Nếu là bài học đầu tiên của một chương
    if (lessonIndex === 0) {
      if (chapterIndex === 0) return true;
      const prevChapter = chapters[chapterIndex - 1];
      if (!prevChapter || prevChapter.lessons.length === 0) return true;
      const lastLesson = prevChapter.lessons[prevChapter.lessons.length - 1];
      return lastLesson.is_completed;
    }

    // Các bài học dựa trên bài học liền trước
    const prevLesson = chapters[chapterIndex].lessons[lessonIndex - 1];
    return prevLesson.is_completed;
  };

  const isStageUnlocked = (chapterIndex: number): boolean => {
    if (chapterIndex === 0) return true;
    const prevChapter = chapters[chapterIndex - 1];
    if (!prevChapter) return true;
    // Để đơn giản, chương tiếp theo mở khóa nếu hoàn thành bài cuối cùng của chương trước
    if (prevChapter.lessons.length === 0) return true;
    return prevChapter.lessons[prevChapter.lessons.length - 1].is_completed;
  };

  const getCurrentLessonId = (chapterIndex: number): string | null => {
    const chapter = chapters[chapterIndex];
    if (!chapter) return null;
    for (let i = 0; i < chapter.lessons.length; i++) {
      if (
        isLessonUnlocked(chapterIndex, i) &&
        !chapter.lessons[i].is_completed
      ) {
        return chapter.lessons[i].id;
      }
    }
    return null;
  };

  const handleLessonClick = (lessonIndex: number, chapterIndex: number) => {
    if (!isLessonUnlocked(chapterIndex, lessonIndex)) return;
    navigate("/practice", {
      state: {
        lesson: chapters[chapterIndex].lessons[lessonIndex],
        chapter: chapters[chapterIndex],
      },
    });
  };

  const handleBossClick = (chapter: Chapter) => {
    if (!chapter.boss || !chapter.boss.is_unlocked) return;
    navigate("/boss-challenge", {
      state: {
        stageId: chapter.id,
        stageTitle: chapter.title,
        boss: chapter.boss,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />

      {/* ── Sub Header (Energy, Stars) ── */}
      <div className="sticky top-16 z-40 w-full pointer-events-none">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-end h-14 gap-3 py-2">
            {/* Energy */}
            <div className="flex items-center gap-1.5 bg-yellow-400 neo-border neo-shadow-sm px-3 py-1 pointer-events-auto">
              <Zap className="w-4 h-4 fill-black text-black" />
              <span className="font-black text-sm text-black">
                {hearts}/{profile?.max_energy ?? 20}
              </span>
            </div>
            {/* Points */}
            <div className="hidden sm:flex items-center gap-1.5 bg-primary neo-border neo-shadow-sm px-3 py-1 pointer-events-auto">
              <Star className="w-4 h-4 fill-white text-white" />
              <span className="font-black text-sm text-white">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto w-full px-6 pt-10 pb-12 relative">
        {chapters.map((chapter, stageIndex) => {
          const stageUnlocked = isStageUnlocked(stageIndex);
          const bossUnlocked = chapter.boss?.is_unlocked;
          const currentLessonId = getCurrentLessonId(stageIndex);

          return (
            <div key={chapter.id}>
              <section className="mb-20">
                {/* Chapter label */}
                <div
                  className={`inline-block px-4 py-1 font-black uppercase neo-shadow text-sm tracking-wider ${
                    stageUnlocked
                      ? "bg-foreground text-background"
                      : "bg-muted-foreground/60 text-white"
                  }`}
                >
                  Chapter {stageIndex + 1}: {chapter.title}
                </div>

                <div className="flex flex-col items-center gap-6 mt-8">
                  {/* Scenes grid */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto ${
                      !stageUnlocked
                        ? "opacity-60 grayscale pointer-events-none"
                        : ""
                    }`}
                  >
                    {chapter.lessons.map((lesson, lessonIndex) => {
                      const unlocked = isLessonUnlocked(
                        stageIndex,
                        lessonIndex,
                      );
                      const completed = lesson.is_completed;
                      const isCurrent = lesson.id === currentLessonId;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() =>
                            handleLessonClick(lessonIndex, stageIndex)
                          }
                          disabled={!unlocked}
                          className={`relative neo-border p-6 text-left min-h-[100px] flex items-center justify-between transition-all ${
                            completed
                              ? "bg-card neo-shadow cursor-pointer hover:-translate-y-0.5"
                              : unlocked
                                ? isCurrent
                                  ? "bg-card neo-shadow cursor-pointer hover:-translate-y-0.5 outline outline-4 outline-primary/30 outline-offset-[6px]"
                                  : "bg-card neo-shadow cursor-pointer hover:-translate-y-0.5"
                                : "bg-muted opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <span className="font-black uppercase text-sm leading-snug block">
                              {lesson.title}
                            </span>
                          </div>

                          {!unlocked && (
                            <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          {completed && (
                            <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                          )}

                          {/* "ĐANG HỌC" badge */}
                          {isCurrent && (
                            <div className="absolute -bottom-3.5 left-4 bg-foreground text-background px-2 py-0.5 text-[10px] font-black uppercase italic z-10">
                              Đang học
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Boss Fight card */}
                  <div className="w-full max-w-2xl">
                    <div
                      className={`neo-border neo-shadow p-8 flex flex-col items-center gap-4 text-center ${
                        bossUnlocked
                          ? "bg-red-500 text-white"
                          : "bg-muted opacity-70"
                      }`}
                    >
                      <Skull className="w-14 h-14" />
                      <div>
                        <h3 className="text-2xl font-black uppercase italic">
                          Boss Fight
                        </h3>
                        {chapter.boss ? (
                          <p className="text-sm font-bold opacity-90 mt-1">
                            Boss theo cấu hình production của chapter này
                          </p>
                        ) : (
                          <p className="text-sm font-bold opacity-90 mt-1">
                            Kiểm tra kiến thức {chapter.title}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleBossClick(chapter)}
                        disabled={!bossUnlocked}
                        className={`bg-white text-foreground neo-border px-8 py-2 font-black uppercase text-sm neo-shadow-sm transition-all ${
                          bossUnlocked
                            ? "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {bossUnlocked
                          ? "Thách đấu"
                          : `Hoàn thành ${chapter.boss_unlock_threshold}% bài học`}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          );
        })}
        {chapters.length === 0 && (
          <div className="text-center py-20 text-muted-foreground font-black text-xl">
            Chưa có bài học nào được xuất bản.
          </div>
        )}
      </main>
    </div>
  );
};

export default RoadMap;
