import { useLocation, Navigate } from "react-router-dom";
import BossChallenge from "@/components/BossChallenge";

// Lesson-based scenarios mapping
const lessonScenarios: Record<string, { scenarios: string[], personalities: string[] }> = {
  "Xin chào": {
    scenarios: [
      "Bạn đang tham dự một workshop về tài chính và bất ngờ gặp lại người bạn cũ ngồi cạnh",
      "Bạn lạc đường và cần nhờ người lạ chỉ đường",
      "Bạn vừa chuyển đến khu phố mới và gặp hàng xóm lần đầu"
    ],
    personalities: [
      "friendly and enthusiastic - người bạn cũ vui vẻ",
      "helpful but busy - người lạ tốt bụng nhưng hơi vội",
      "curious and talkative - hàng xóm tọc mạch"
    ]
  },
  "Cảm ơn & Xin lỗi": {
    scenarios: [
      "Bạn vô tình làm đổ cà phê lên áo của đồng nghiệp",
      "Người lạ giúp bạn nhặt đồ rơi trên đường",
      "Bạn đến muộn buổi hẹn với bạn bè"
    ],
    personalities: [
      "understanding but slightly annoyed - đồng nghiệp hiểu biết nhưng hơi khó chịu",
      "kind and patient - người lạ tử tế và kiên nhẫn",
      "forgiving friend - bạn bè hay tha thứ"
    ]
  },
  "Đồng ý & Từ chối": {
    scenarios: [
      "Sếp mời bạn làm thêm giờ vào cuối tuần",
      "Bạn bè rủ đi chơi nhưng bạn đang bận",
      "Hàng xóm nhờ trông coi nhà khi đi vắng"
    ],
    personalities: [
      "demanding boss - sếp đòi hỏi cao",
      "persuasive friend - bạn bè hay thuyết phục",
      "friendly neighbor - hàng xóm thân thiện"
    ]
  },
  "default": {
    scenarios: [
      "Bạn gặp một tình huống giao tiếp thực tế liên quan đến bài học này",
      "Một người lạ tiếp cận bạn trong tình huống thực tế"
    ],
    personalities: [
      "neutral and professional",
      "friendly and casual"
    ]
  }
};

const BossChallengeWrapper = () => {
  const location = useLocation();
  const state = location.state as {
    stageId: number;
    sceneId?: number;
    lessonTitle?: string;
    stageTitle?: string;
    // Legacy props from old boss system
    scenario?: string;
    scenarioName?: string;
    gender?: "male" | "female";
    personality?: string;
    personalityName?: string;
  } | null;

  if (!state) {
    return <Navigate to="/roadmap" replace />;
  }

  // Generate random boss if coming from lesson
  if (state.lessonTitle) {
    const lessonConfig = lessonScenarios[state.lessonTitle] || lessonScenarios["default"];
    const randomScenario = lessonConfig.scenarios[Math.floor(Math.random() * lessonConfig.scenarios.length)];
    const randomPersonality = lessonConfig.personalities[Math.floor(Math.random() * lessonConfig.personalities.length)];
    const randomGender: "male" | "female" = Math.random() > 0.5 ? "male" : "female";

    return (
      <BossChallenge
        scenario={randomScenario}
        scenarioName={randomScenario}
        gender={randomGender}
        personality={randomPersonality}
        personalityName={randomPersonality}
        stageId={state.stageId}
      />
    );
  }

  // Legacy support for old boss system
  if (!state.scenario || !state.scenarioName || !state.gender || !state.personality || !state.personalityName) {
    return <Navigate to="/roadmap" replace />;
  }

  return (
    <BossChallenge
      scenario={state.scenario}
      scenarioName={state.scenarioName}
      gender={state.gender}
      personality={state.personality}
      personalityName={state.personalityName}
      stageId={state.stageId}
    />
  );
};

export default BossChallengeWrapper;