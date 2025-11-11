import { useLocation, Navigate } from "react-router-dom";
import BossChallenge from "@/components/BossChallenge";

const BossChallengeWrapper = () => {
  const location = useLocation();
  const state = location.state as {
    scenario: string;
    scenarioName: string;
    gender: "male" | "female";
    personality: string;
    personalityName: string;
    stageId: number;
  } | null;

  if (!state) {
    return <Navigate to="/boss" replace />;
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