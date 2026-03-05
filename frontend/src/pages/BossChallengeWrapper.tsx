import { useLocation, Navigate } from "react-router-dom";
import BossChallenge from "@/components/BossChallenge";

// Stage-based scenario configurations (for post-stage boss challenges)
const stageScenarios: Record<string, { scenarios: string[]; personalities: string[] }> = {
  "Giao tiếp cơ bản": {
    scenarios: [
      "Bạn đang tham dự một workshop về tài chính và bất ngờ gặp lại người bạn cũ ngồi cạnh",
      "Bạn gặp người lạ tò mò hỏi về công việc của bạn",
      "Bạn vừa chuyển đến khu phố mới và gặp hàng xóm lần đầu"
    ],
    personalities: [
      "friendly and enthusiastic - người bạn vui vẻ",
      "curious and talkative - người tọc mạch",
      "kind and welcoming - hàng xóm thân thiện"
    ]
  },
  "Giao tiếp lớp học": {
    scenarios: [
      "Giáo viên yêu cầu bạn phát biểu ý kiến về một chủ đề khó",
      "Bạn cần phản biện ý kiến của bạn cùng nhóm một cách lịch sự",
      "Bạn phải trình bày bài tập nhóm trước lớp"
    ],
    personalities: [
      "strict teacher - giáo viên nghiêm khắc",
      "skeptical classmate - bạn học hay hoài nghi",
      "encouraging teacher - giáo viên khích lệ"
    ]
  },
  "Thuyết trình đám đông": {
    scenarios: [
      "Bạn đang thuyết trình và có người đặt câu hỏi khó",
      "Bạn cần thuyết phục nhà đầu tư về ý tưởng của mình",
      "Bạn phải giải trình khi bị phản đối mạnh"
    ],
    personalities: [
      "critical investor - nhà đầu tư khó tính",
      "skeptical audience member - khán giả hoài nghi",
      "demanding stakeholder - bên liên quan đòi hỏi cao"
    ]
  },
  default: {
    scenarios: [
      "Bạn gặp một tình huống giao tiếp thực tế cần xử lý",
      "Một người lạ tiếp cận bạn trong tình huống bất ngờ"
    ],
    personalities: [
      "neutral and professional - trung lập và chuyên nghiệp",
      "friendly and casual - thân thiện và thoải mái"
    ]
  }
};

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

  // Stage-based boss challenge (from /roadmap after completing all lessons)
  if (state.stageTitle && !state.lessonTitle) {
    const stageConfig = stageScenarios[state.stageTitle] || stageScenarios["default"];
    const randomScenario = stageConfig.scenarios[Math.floor(Math.random() * stageConfig.scenarios.length)];
    const randomPersonality = stageConfig.personalities[Math.floor(Math.random() * stageConfig.personalities.length)];
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

  // Lesson-based boss challenge (after each lesson)
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

  // Fallback: redirect if no valid state
  return <Navigate to="/roadmap" replace />;
};

export default BossChallengeWrapper;