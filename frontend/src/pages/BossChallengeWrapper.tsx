import { useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BossChallenge from "@/components/BossChallenge";
import type { AdminBossConfig } from "@/types";

// ─── Mock API (to be replaced with adminApi.listBossConfigs()) ────────────────

const MOCK_BOSS_CONFIGS: AdminBossConfig[] = [
  {
    id: "stage-1",
    target_id: "Giao tiếp cơ bản",
    config_type: "stage",
    scenarios: [
      "Bạn đang tham dự một workshop về tài chính và bất ngờ gặp lại người bạn cũ ngồi cạnh. Hãy bắt đầu cuộc trò chuyện.",
      "Bạn vừa chuyển đến khu phố mới và gặp hàng xóm lần đầu tiên. Hãy làm quen.",
      "Bạn gặp người lạ tò mò hỏi về công việc của bạn. Hãy trả lời và giữ cuộc trò chuyện thú vị.",
    ],
    personalities: [
      "friendly and enthusiastic - người bạn cũ vui vẻ, hay hỏi thăm",
      "curious and talkative - hàng xóm tọc mạch nhưng tốt bụng",
      "reserved but polite - người lạ lịch sự nhưng hơi dè dặt",
    ],
  },
  {
    id: "lesson-chao",
    target_id: "Xin chào",
    config_type: "lesson",
    scenarios: [
      "Bạn lạc đường và cần nhờ người lạ chỉ đường đến ga tàu gần nhất.",
      "Bạn vừa chuyển đến khu phố mới và gặp hàng xóm lần đầu.",
    ],
    personalities: [
      "helpful but busy - người lạ tốt bụng nhưng hơi vội",
      "curious and talkative - hàng xóm tọc mạch",
    ],
  },
  {
    id: "lesson-cam-on",
    target_id: "Cảm ơn & Xin lỗi",
    config_type: "lesson",
    scenarios: [
      "Bạn vô tình làm đổ cà phê lên áo của đồng nghiệp trong giờ nghỉ.",
      "Người lạ giúp bạn nhặt đồ rơi trên đường. Hãy phản ứng tự nhiên.",
    ],
    personalities: [
      "understanding but slightly annoyed - đồng nghiệp hiểu biết nhưng hơi khó chịu",
      "kind and patient - người lạ tử tế và kiên nhẫn",
    ],
  },
  {
    id: "lesson-dong-y",
    target_id: "Đồng ý & Từ chối",
    config_type: "lesson",
    scenarios: [
      "Sếp mời bạn làm thêm giờ vào cuối tuần nhưng bạn đã có kế hoạch từ trước.",
      "Bạn bè rủ đi chơi nhưng bạn đang cần hoàn thành deadline gấp.",
    ],
    personalities: [
      "demanding boss - sếp đòi hỏi cao nhưng không phi lý",
      "persuasive friend - bạn bè hay thuyết phục, khó từ chối",
    ],
  },
  {
    id: "stage-classroom",
    target_id: "Giao tiếp lớp học",
    config_type: "stage",
    scenarios: [
      "Giáo viên yêu cầu bạn phát biểu ý kiến về một chủ đề khó mà bạn chưa chuẩn bị kỹ.",
      "Bạn cần phản biện một cách lịch sự quan điểm của bạn cùng nhóm.",
    ],
    personalities: [
      "strict teacher - giáo viên nghiêm khắc, hay đặt câu hỏi phản biện",
      "skeptical classmate - bạn học hay hoài nghi và tranh luận",
    ],
  },
  {
    id: "default",
    target_id: "default",
    config_type: "default",
    scenarios: [
      "Bạn gặp một tình huống giao tiếp thực tế cần xử lý.",
    ],
    personalities: [
      "neutral and professional - trung lập và chuyên nghiệp",
    ],
  },
];

// ─── Boss avatar config ───────────────────────────────────────────────────────

interface BossVisual {
  letter: string;
  color: string;
  name: string;
}

function getBossVisual(personalityName: string, stageId: number): BossVisual {
  const colors = ["#FF6B35", "#7C3AED", "#0EA5E9", "#16A34A", "#DC2626", "#EA580C"];
  const c = colors[stageId % colors.length];
  const firstWord = personalityName.split(" ")[0] ?? "B";
  return {
    letter: firstWord.charAt(0).toUpperCase(),
    color: c,
    name: personalityName.includes("-")
      ? personalityName.split("-")[1].trim()
      : personalityName,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findConfig(
  configs: AdminBossConfig[],
  targetId: string,
  configType: AdminBossConfig["config_type"]
): AdminBossConfig {
  return (
    configs.find((c) => c.target_id === targetId && c.config_type === configType) ??
    configs.find((c) => c.config_type === "default") ??
    configs[0]
  );
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const BossChallengeWrapper = () => {
  const location = useLocation();
  const [configs] = useState<AdminBossConfig[]>(MOCK_BOSS_CONFIGS);

  const state = location.state as {
    stageId: number;
    stageTitle?: string;
    lessonTitle?: string;
  } | null;

  if (!state) return <Navigate to="/roadmap" replace />;

  // Determine which config to use
  const configType: AdminBossConfig["config_type"] = state.stageTitle && !state.lessonTitle ? "stage" : "lesson";
  const targetId = state.lessonTitle ?? state.stageTitle ?? "default";
  const config = findConfig(configs, targetId, configType);

  const scenario = pickRandom(config.scenarios);
  const personality = pickRandom(config.personalities);
  const bossVisual = getBossVisual(personality, state.stageId);

  return (
    <BossChallenge
      bossName={bossVisual.name}
      bossAvatarLetter={bossVisual.letter}
      bossColor={bossVisual.color}
      scenario={scenario}
      scenarioName={scenario}
      personality={personality}
      personalityName={personality.includes("-") ? personality.split("-")[1].trim() : personality}
      stageId={state.stageId}
    />
  );
};

export default BossChallengeWrapper;