import { Trophy, Flame, Award, Target } from "lucide-react";
import Navbar from "@/components/Navbar";

const Achievements = () => {
  const userName = localStorage.getItem("userName") || "bạn";

  const stats = [
    { label: "Streak hiện tại", value: "7 ngày", icon: Flame, color: "bg-primary" },
    { label: "Tổng điểm", value: "1,250", icon: Trophy, color: "bg-secondary" },
    { label: "Cảnh hoàn thành", value: "12/36", icon: Target, color: "bg-accent" },
  ];

  const achievements = [
    {
      id: 1,
      name: "Chiến sĩ tự tin",
      description: "Hoàn thành 5 cảnh liên tiếp",
      earned: true,
      emoji: "🏆",
    },
    {
      id: 2,
      name: "Bậc thầy ngôn từ",
      description: "Đạt 5 sao ở 10 cảnh",
      earned: true,
      emoji: "⭐",
    },
    {
      id: 3,
      name: "Nhà hiền triết",
      description: "Hoàn thành tất cả các chặng",
      earned: false,
      emoji: "🎓",
    },
    {
      id: 4,
      name: "Vua Boss",
      description: "Đánh bại 5 ải Trùm cuối",
      earned: false,
      emoji: "👑",
    },
    {
      id: 5,
      name: "Streak master",
      description: "Duy trì streak 30 ngày",
      earned: false,
      emoji: "🔥",
    },
    {
      id: 6,
      name: "Người bạn đồng hành",
      description: "Luyện tập 100 lần",
      earned: false,
      emoji: "💪",
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2">
            Thành tựu của {userName}
          </h1>
          <p className="text-lg font-bold text-muted-foreground">
            Theo dõi tiến độ và nhận phần thưởng
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`${stat.color} text-white neo-border neo-shadow rounded-sm p-6`}
              >
                <Icon className="w-8 h-8 mb-3" />
                <div className="text-3xl font-black mb-1">{stat.value}</div>
                <div className="text-sm font-bold opacity-90">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Achievements */}
        <div>
          <h2 className="text-2xl font-black text-foreground mb-4 flex items-center gap-2">
            <Award className="w-6 h-6" />
            Danh hiệu
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-6 rounded-sm neo-border transition-all ${
                  achievement.earned
                    ? "bg-card neo-shadow"
                    : "bg-muted opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{achievement.emoji}</div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground mb-1">{achievement.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      {achievement.description}
                    </p>
                    {achievement.earned && (
                      <div className="mt-2">
                        <span className="text-xs font-bold text-secondary">✓ Đã đạt được</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
