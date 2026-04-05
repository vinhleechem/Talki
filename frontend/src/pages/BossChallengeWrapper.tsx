import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BossChallenge from "@/components/BossChallenge";
import { bossApi } from "@/services/bossApi";
import { paymentApi } from "@/services/paymentService";
import type { BossSessionResponse } from "@/services/bossApi";
import type { ManualPaymentConfig } from "@/types";

// ─── Boss avatar config ───────────────────────────────────────────────────────

const BOSS_COLORS = [
  "#FF6B35",
  "#7C3AED",
  "#0EA5E9",
  "#16A34A",
  "#DC2626",
  "#EA580C",
];

function getBossVisual(personalityName: string, stageId: number) {
  const color = BOSS_COLORS[stageId % BOSS_COLORS.length];
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
    stageId: number;
    stageTitle?: string;
    lessonTitle?: string;
  } | null;

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [session, setSession] = useState<BossSessionResponse | null>(null);
  const [paymentConfig, setPaymentConfig] =
    useState<ManualPaymentConfig | null>(null);

  useEffect(() => {
    if (!state) return;

    async function boot() {
      try {
        // Production matching rule: lesson -> stage -> default
        const [configsResult, configResult] = await Promise.allSettled([
          bossApi.listConfigs(),
          paymentApi.getConfig(),
        ]);

        if (configResult.status === "fulfilled") {
          setPaymentConfig(configResult.value);
        }

        if (configsResult.status !== "fulfilled") {
          throw configsResult.reason;
        }

        const configs = configsResult.value;
        const normalize = (v?: string) => (v || "").trim().toLowerCase();

        const lessonTitle = state!.lessonTitle?.trim();
        const stageTitle = state!.stageTitle?.trim();

        const matchedLesson = lessonTitle
          ? configs.find(
              (c) =>
                c.config_type === "lesson" &&
                normalize(c.target_id) === normalize(lessonTitle),
            )
          : undefined;

        const matchedStage = stageTitle
          ? configs.find(
              (c) =>
                c.config_type === "stage" &&
                normalize(c.target_id) === normalize(stageTitle),
            )
          : undefined;

        const matchedDefault =
          configs.find((c) => c.config_type === "default") ?? configs[0];

        const resolved = matchedLesson ?? matchedStage ?? matchedDefault;

        if (!resolved) {
          throw new Error(
            "Chưa có cấu hình Boss. Admin cần tạo ít nhất 1 cấu hình default.",
          );
        }

        // Create session — BE picks scenario + personality for us
        const sess = await bossApi.createSession({
          target_id: resolved.target_id,
          config_type: resolved.config_type,
          max_turns: 7,
          pass_score: 60,
        });

        setSession(sess);
        setLoadState("ready");
      } catch (e) {
        setErrorMsg(
          e instanceof Error ? e.message : "Không thể bắt đầu Boss Fight",
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
      bossName={bossVisual.name}
      bossAvatarLetter={bossVisual.letter}
      bossColor={bossVisual.color}
      scenario={session.scenario}
      personalityName={bossVisual.name}
      maxTurns={session.max_turns}
      passScore={session.pass_score}
      bossFightCost={paymentConfig?.boss_fight_cost ?? 3}
      greetingText={session.greeting_text}
      greetingAudioB64={session.greeting_audio_b64}
    />
  );
};

export default BossChallengeWrapper;
