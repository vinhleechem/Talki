import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Check, Star, Skull } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/integrations/supabase/client";

interface Stage {
  id: number;
  title: string;
  scenes: Scene[];
  unlocked: boolean;
  completed: boolean;
}

interface Scene {
  id: number;
  title: string;
  unlocked: boolean;
  completed: boolean;
  stars: number;
}

const RoadMap = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("bạn");
  const { progress, loading, isBossUnlocked, checkBossPassed } = useProgress();
  const [bossStatus, setBossStatus] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.name) {
        setUserName(user.user_metadata.name);
        localStorage.setItem("userName", user.user_metadata.name);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const checkAllBosses = async () => {
      const statuses: Record<number, boolean> = {};
      for (const stage of stages) {
        statuses[stage.id] = await checkBossPassed(stage.id);
      }
      setBossStatus(statuses);
    };
    
    if (!loading) {
      checkAllBosses();
    }
  }, [loading, progress]);

  const getSceneProgress = (stageId: number, sceneId: number) => {
    const sceneProgress = progress.find(
      p => p.stage_id === stageId && p.scene_id === sceneId
    );
    return {
      completed: sceneProgress?.completed || false,
      stars: sceneProgress?.stars || 0,
    };
  };

  const isSceneUnlocked = (stageId: number, sceneId: number): boolean => {
    // First scene of first stage is always unlocked
    if (stageId === 1 && sceneId === 1) return true;
    
    // Check if previous stage boss was defeated
    if (sceneId === 1 && stageId > 1) {
      return bossStatus[stageId - 1] === true;
    }
    
    // Check if previous scene in same stage is completed
    const prevSceneProgress = progress.find(
      p => p.stage_id === stageId && p.scene_id === sceneId - 1 && p.completed
    );
    
    return !!prevSceneProgress;
  };

  const [stages] = useState<Stage[]>([
    {
      id: 1,
      title: "Giao tiếp cơ bản",
      unlocked: true,
      completed: false,
      scenes: [
        { id: 1, title: "Xin chào", unlocked: true, completed: true, stars: 5 },
        { id: 2, title: "Cảm ơn & Xin lỗi", unlocked: true, completed: false, stars: 0 },
        { id: 3, title: "Đồng ý & Từ chối", unlocked: true, completed: false, stars: 0 },
        { id: 4, title: "Hỏi thăm", unlocked: true, completed: false, stars: 0 },
      ],
    },
    {
      id: 2,
      title: "Giao tiếp lớp học",
      unlocked: false,
      completed: false,
      scenes: [
        { id: 5, title: "Giơ tay phát biểu", unlocked: false, completed: false, stars: 0 },
        { id: 6, title: "Hỏi - Trả lời GV", unlocked: false, completed: false, stars: 0 },
        { id: 7, title: "Làm việc nhóm", unlocked: false, completed: false, stars: 0 },
        { id: 8, title: "Phản hồi & tranh luận", unlocked: false, completed: false, stars: 0 },
      ],
    },
    {
      id: 3,
      title: "Thuyết trình đám đông",
      unlocked: false,
      completed: false,
      scenes: [
        { id: 9, title: "Chuẩn bị nội dung", unlocked: false, completed: false, stars: 0 },
        { id: 10, title: "Diễn đạt tự tin", unlocked: false, completed: false, stars: 0 },
        { id: 11, title: "Ứng biến khi bị hỏi", unlocked: false, completed: false, stars: 0 },
        { id: 12, title: "Kết thúc ấn tượng", unlocked: false, completed: false, stars: 0 },
      ],
    },
  ]);

  const handleSceneClick = (scene: Scene, stage: Stage) => {
    const unlocked = isSceneUnlocked(stage.id, scene.id);
    if (!unlocked) return;
    navigate("/practice", { state: { scene, stage } });
  };

  const handleBossClick = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    
    const totalScenes = stage.scenes.length;
    if (!isBossUnlocked(stageId, totalScenes)) {
      return;
    }
    
    navigate("/boss", { state: { stageId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-24">
        {/* Welcome */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2">
            Chào mừng trở lại, {userName}! 👋
          </h1>
          <p className="text-lg font-bold text-muted-foreground">
            Hãy tiếp tục hành trình chinh phục giao tiếp của bạn
          </p>
        </div>

        {/* Road Map */}
        <div className="max-w-4xl mx-auto space-y-12">
          {stages.map((stage, stageIndex) => (
            <div key={stage.id} className="relative">
              {/* Stage Header */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-16 h-16 rounded-sm flex items-center justify-center font-black text-2xl neo-border neo-shadow ${
                    stage.unlocked
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stage.id}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground">{stage.title}</h2>
                  <p className="text-sm font-bold text-muted-foreground">
                    {stage.completed
                      ? "Hoàn thành! 🎉"
                      : stage.unlocked
                      ? "Đang học"
                      : "Chưa mở khóa"}
                  </p>
                </div>
              </div>

              {/* Scenes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-0 sm:pl-20">
                {stage.scenes.map((scene) => {
                  const sceneProgress = getSceneProgress(stage.id, scene.id);
                  const unlocked = isSceneUnlocked(stage.id, scene.id);
                  
                  return (
                    <button
                      key={scene.id}
                      onClick={() => handleSceneClick(scene, stage)}
                      disabled={!unlocked}
                      className={`p-4 rounded-sm neo-border text-left transition-all ${
                        unlocked
                          ? "bg-card hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none neo-shadow cursor-pointer"
                          : "bg-muted cursor-not-allowed opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-foreground">{scene.title}</h3>
                        {!unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                        {sceneProgress.completed && <Check className="w-4 h-4 text-secondary" />}
                      </div>

                      {/* Stars */}
                      {sceneProgress.completed && (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < sceneProgress.stars
                                  ? "text-primary fill-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Boss Button */}
              {isBossUnlocked(stage.id, stage.scenes.length) && (
                <div className="mt-6 pl-0 sm:pl-20">
                  <button
                    onClick={() => handleBossClick(stage.id)}
                    className={`w-full p-6 rounded-sm neo-border transition-all ${
                      bossStatus[stage.id]
                        ? "bg-secondary text-secondary-foreground neo-shadow"
                        : "bg-primary text-primary-foreground hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none neo-shadow cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Skull className="w-6 h-6" />
                      <h3 className="font-black text-xl">
                        {bossStatus[stage.id] ? "Boss Defeated! ✓" : "Challenge Boss"}
                      </h3>
                      <Skull className="w-6 h-6" />
                    </div>
                    {!bossStatus[stage.id] && (
                      <p className="text-sm font-medium text-center mt-2 opacity-90">
                        Test your skills in a real scenario
                      </p>
                    )}
                  </button>
                </div>
              )}

              {/* Connector Line */}
              {stageIndex < stages.length - 1 && (
                <div className="flex justify-center my-8">
                  <div className="w-1 h-12 bg-border"></div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default RoadMap;
