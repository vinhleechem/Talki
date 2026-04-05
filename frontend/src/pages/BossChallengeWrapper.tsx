import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BossChallenge from "@/components/BossChallenge";
import { bossApi } from "@/services/bossApi";
import type { BossSessionResponse } from "@/services/bossApi";

// ─── Boss avatar config ───────────────────────────────────────────────────────

const BOSS_COLORS = [
  "#FF6B35",
  "#7C3AED",
  "#0EA5E9",
  "#16A34A",
  "#DC2626",
  "#EA580C",
];

function getBossVisual(personalityName: string, stageId: string) {
  const hash = stageId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const color = BOSS_COLORS[hash % BOSS_COLORS.length];
  const firstWord = personalityName.split(" ")[0] ?? "B";
  const displayName = personalityName.includes("-")
    ? personalityName.split("-")[1].trim()
    : personalityName;
  return {
    letter: firstWord.charAt(0).toUpperCase(),
    color,
    name: displayName,
  };
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const BossChallengeWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    stageId: string;
    stageTitle?: string;
    lessonTitle?: string;
  } | null;

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [session, setSession] = useState<BossSessionResponse | null>(null);

  useEffect(() => {
    if (!state) return;

    async function boot() {
      try {
        // Just call the API with the chapter_id
        const sess = await bossApi.createSession({
          chapter_id: state!.stageId,
          max_turns: 7,
          pass_score: 60,
        });

        setSession(sess);
        setLoadState("ready");
      } catch (error) {
        const e = error as any;
        setErrorMsg(
          e?.response?.data?.detail === "Chapter not found" || e?.response?.data?.detail?.includes("NoneType") || e?.message?.includes("NoneType")
            ? "Chapter này đang được thiết lập Boss Fight..."
            : e instanceof Error
              ? e.message
              : "Không thể bắt đầu Boss Fight"
        );
        setLoadState("error");
      }
    }

    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <Navigate to="/roadmap" replace />;

  // ── Loading ──
  if (loadState === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-bold text-muted-foreground">
          Đang chuẩn bị Boss Fight...
        </p>
      </div>
    );
  }

  // ── Error ──
  if (loadState === "error" || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-xl font-black">Không thể bắt đầu</p>
        <p className="text-muted-foreground text-sm max-w-xs">{errorMsg}</p>
        <Button onClick={() => navigate("/roadmap")}>Về Bản đồ</Button>
      </div>
    );
  }

  const bossVisual = getBossVisual(session.personality, state.stageId);

  return (
    <BossChallenge
      sessionId={session.session_id}
      bossName={session.personality}
      bossAvatarLetter={bossVisual.letter}
      bossColor={bossVisual.color}
      scenarioTitle={session.scenario_title}
      scenarioContext={session.scenario}
      chapterTitle={state.stageTitle}
      personalityName={session.personality}
      maxTurns={session.max_turns}
      passScore={session.pass_score}
      greetingText={session.greeting_text}
      greetingAudioB64={session.greeting_audio_b64}
    />
  );
};

export default BossChallengeWrapper;
