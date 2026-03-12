import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { BookOpen, Zap, Star, Lock, Check, Skull, Map, Trophy, User } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { useUser } from "@/contexts/UserContext";

interface Stage {
  id: number;
  title: string;
  scenes: Scene[];
  unlocked: boolean;
  completed: boolean;
  /** Percentage of scenes (0–100) that must be completed to unlock the boss */
  bossThreshold: number;
}

interface Scene {
  id: number;
  title: string;
  question?: string;
  unlocked: boolean;
  completed: boolean;
  stars: number;
}

const RoadMap = () => {
  const navigate = useNavigate();
  const { profile, hearts } = useUser();
  const { progress, loading, isBossUnlocked, checkBossPassed } = useProgress();
  const [bossStatus, setBossStatus] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const checkAllBosses = async () => {
      const statuses: Record<number, boolean> = {};
      for (const stage of stages) {
        statuses[stage.id] = await checkBossPassed(stage.id);
      }
      setBossStatus(statuses);
    };
    if (!loading) checkAllBosses();
  }, [loading, progress, checkBossPassed]); // eslint-disable-line react-hooks/exhaustive-deps

  const getSceneProgress = (stageId: number, sceneId: number) => {
    const sp = progress.find((p) => p.stage_id === stageId && p.scene_id === sceneId);
    return { completed: sp?.completed || false, stars: sp?.stars || 0 };
  };

  const isSceneUnlocked = (stageId: number, sceneId: number): boolean => {
    if (stageId === 1 && sceneId === 1) return true;
    if (sceneId === 1 && stageId > 1) return bossStatus[stageId - 1] === true;
    const prev = progress.find((p) => p.stage_id === stageId && p.scene_id === sceneId - 1 && p.completed);
    return !!prev;
  };

  const isStageUnlocked = (stageId: number): boolean => {
    if (stageId === 1) return true;
    return bossStatus[stageId - 1] === true;
  };

  /** Returns scene.id of the first unlocked-but-not-completed scene in a stage */
  const getCurrentSceneId = (stageId: number, scenes: Scene[]): number | null => {
    for (const scene of scenes) {
      const unlocked = isSceneUnlocked(stageId, scene.id);
      const { completed } = getSceneProgress(stageId, scene.id);
      if (unlocked && !completed) return scene.id;
    }
    return null;
  };

  const [stages] = useState<Stage[]>([
    {
      id: 1,
      title: "Giao tiếp cơ bản",
      unlocked: true,
      completed: false,
      bossThreshold: 100,
      scenes: [
        {
          id: 1,
          title: "Xin chào",
          question: "Hãy chào một bạn mới trong lớp theo cách thân thiện và tự tin.",
          unlocked: true,
          completed: true,
          stars: 5,
        },
        {
          id: 2,
          title: "Cảm ơn & Xin lỗi",
          question: "Hãy nói lời cảm ơn và xin lỗi với người bạn vô tình làm phiền.",
          unlocked: true,
          completed: false,
          stars: 0,
        },
        {
          id: 3,
          title: "Đồng ý & Từ chối",
          question: "Một bạn rủ bạn tham gia hoạt động mà bạn không thích. Hãy từ chối nhưng vẫn giữ phép lịch sự.",
          unlocked: true,
          completed: false,
          stars: 0,
        },
        {
          id: 4,
          title: "Hỏi thăm",
          question: "Gặp lại một người bạn sau kỳ nghỉ, hãy bắt chuyện hỏi thăm một cách tự nhiên.",
          unlocked: true,
          completed: false,
          stars: 0,
        },
      ],
    },
    {
      id: 2,
      title: "Giao tiếp lớp học",
      unlocked: false,
      completed: false,
      bossThreshold: 100,
      scenes: [
        {
          id: 5,
          title: "Giơ tay phát biểu",
          question: "Trong giờ học, bạn muốn đặt câu hỏi với giáo viên. Hãy mở đầu câu hỏi một cách tự tin.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
        {
          id: 6,
          title: "Hỏi - Trả lời GV",
          question: "Giáo viên gọi tên bạn trả lời. Hãy trả lời ngắn gọn, rõ ràng và lễ phép.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
        {
          id: 7,
          title: "Làm việc nhóm",
          question: "Bạn chuẩn bị bắt đầu làm việc nhóm. Hãy giới thiệu ý kiến của mình với các bạn trong nhóm.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
        {
          id: 8,
          title: "Phản hồi & tranh luận",
          question: "Một bạn nói ý kiến mà bạn chưa đồng ý. Hãy góp ý và tranh luận một cách tôn trọng.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
      ],
    },
    {
      id: 3,
      title: "Thuyết trình đám đông",
      unlocked: false,
      completed: false,
      bossThreshold: 100,
      scenes: [
        {
          id: 9,
          title: "Chuẩn bị nội dung",
          question: "Hãy mở đầu bài thuyết trình về chủ đề yêu thích của bạn trong 2–3 câu.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
        {
          id: 10,
          title: "Diễn đạt tự tin",
          question: "Bạn đang ở giữa bài thuyết trình. Hãy nói một đoạn thể hiện sự tự tin và kết nối với khán giả.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
        {
          id: 11,
          title: "Ứng biến khi bị hỏi",
          question: "Sau phần trình bày, một người hỏi bạn một câu khó. Hãy trả lời bình tĩnh và chân thành.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
        {
          id: 12,
          title: "Kết thúc ấn tượng",
          question: "Hãy đưa ra câu kết thúc thật ấn tượng để cảm ơn và chào khán giả.",
          unlocked: false,
          completed: false,
          stars: 0,
        },
      ],
    },
  ]);

  const handleSceneClick = (scene: Scene, stage: Stage) => {
    if (!isSceneUnlocked(stage.id, scene.id)) return;
    navigate("/practice", { state: { scene, stage } });
  };

  const handleBossClick = (stageId: number) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    if (!isBossUnlocked(stageId, stage.scenes.length, stage.bossThreshold)) return;
    navigate("/boss-challenge", { state: { stageId, stageTitle: stage.title } });
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
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 w-full bg-card neo-border-b flex items-center justify-between px-4 md:px-10 h-16">
        <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="bg-primary neo-border neo-shadow-sm w-10 h-10 flex items-center justify-center">
            <span className="text-xl font-black text-primary-foreground">T</span>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Talki Map</h1>
        </NavLink>

        <div className="flex items-center gap-3">
          {/* Energy */}
          <div className="flex items-center gap-1.5 bg-yellow-400 neo-border neo-shadow-sm px-3 py-1">
            <Zap className="w-4 h-4 fill-black text-black" />
            <span className="font-black text-sm text-black">{hearts}/20</span>
          </div>
          {/* Points (mock) */}
          <div className="hidden sm:flex items-center gap-1.5 bg-primary neo-border neo-shadow-sm px-3 py-1">
            <Star className="w-4 h-4 fill-white text-white" />
            <span className="font-black text-sm text-white">1,240</span>
          </div>
          {/* Avatar */}
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 neo-border neo-shadow-sm bg-muted flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </button>

          {/* Exit map */}
          <button
            onClick={() => navigate("/")}
            className="ml-2 px-3 py-1 text-xs font-black uppercase tracking-wider neo-border hover:bg-muted transition-colors"
          >
            Thoát
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 relative">
        {stages.map((stage, stageIndex) => {
          const stageUnlocked = isStageUnlocked(stage.id);
          const bossUnlocked = isBossUnlocked(stage.id, stage.scenes.length, stage.bossThreshold);
          const currentSceneId = getCurrentSceneId(stage.id, stage.scenes);

          return (
            <div key={stage.id}>
              <section className="mb-20">
                {/* Chapter label */}
                <div
                  className={`inline-block px-4 py-1 font-black uppercase neo-shadow text-sm tracking-wider ${
                    stageUnlocked ? "bg-foreground text-background" : "bg-muted-foreground/60 text-white"
                  }`}
                >
                  Chapter {stage.id}: {stage.title}
                </div>

                <div className="flex flex-col items-center gap-6 mt-8">
                  {/* Scenes grid */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto ${
                      !stageUnlocked ? "opacity-60 grayscale pointer-events-none" : ""
                    }`}
                  >
                    {stage.scenes.map((scene) => {
                      const unlocked = isSceneUnlocked(stage.id, scene.id);
                      const { completed, stars } = getSceneProgress(stage.id, scene.id);
                      const isCurrent = scene.id === currentSceneId;

                      return (
                        <button
                          key={scene.id}
                          onClick={() => handleSceneClick(scene, stage)}
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
                            <span className="font-black uppercase text-sm leading-snug block">{scene.title}</span>
                            {completed && (
                              <div className="flex items-center gap-0.5 mt-1.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < stars ? "text-primary fill-primary" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {!unlocked && <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                          {completed && <Check className="w-4 h-4 text-secondary flex-shrink-0" />}

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
                        bossStatus[stage.id]
                          ? "bg-secondary text-white"
                          : bossUnlocked
                            ? "bg-red-500 text-white"
                            : "bg-muted opacity-70"
                      }`}
                    >
                      <Skull className="w-14 h-14" />
                      <div>
                        <h3 className="text-2xl font-black uppercase italic">Boss Fight</h3>
                        <p className="text-sm font-bold opacity-90 mt-1">Kiểm tra kiến thức Chương {stage.id}</p>
                      </div>
                      <button
                        onClick={() => handleBossClick(stage.id)}
                        disabled={!bossUnlocked || bossStatus[stage.id]}
                        className={`bg-white text-foreground neo-border px-8 py-2 font-black uppercase text-sm neo-shadow-sm transition-all ${
                          bossUnlocked && !bossStatus[stage.id]
                            ? "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {bossStatus[stage.id]
                          ? "Đã chinh phục ✓"
                          : bossUnlocked
                            ? "Thách đấu"
                            : `Hoàn thành ${stage.bossThreshold}% bài học`}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          );
        })}
      </main>

      {/* ── Right Sidebar (xl only) ── */}
      <aside className="fixed top-24 right-6 hidden xl:flex flex-col gap-4 w-64">
        {/* Daily quests */}
        <div className="bg-card neo-border neo-shadow p-4">
          <h4 className="font-black uppercase text-sm mb-3 pb-2 border-b-2 border-foreground">Nhiệm vụ ngày</h4>
          <ul className="space-y-3">
            <li className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold">
                <span>Học 3 bài mới</span>
                <span>2/3</span>
              </div>
              <div className="h-3 bg-muted neo-border overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "66%" }} />
              </div>
            </li>
            <li className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold">
                <span>Đạt 5 sao</span>
                <span>3/5</span>
              </div>
              <div className="h-3 bg-muted neo-border overflow-hidden">
                <div className="h-full bg-yellow-400" style={{ width: "60%" }} />
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default RoadMap;
