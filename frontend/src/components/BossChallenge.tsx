import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Trophy,
  Mic,
  MicOff,
  Shield,
  Swords,
  RotateCcw,
  Volume2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { VoiceActivityDetector } from "@/utils/voiceRecorder";
import { openBossWebSocket, sendAudioToWs, sendWsControl } from "@/services/bossApi";
import type { BossTurnResult } from "@/services/bossApi";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

type FightStatus =
  | "connecting"    // Creating WS connection
  | "boss-speaking" // Boss audio playing
  | "listening"     // VAD active, waiting for user
  | "user-speaking" // VAD detected user voice
  | "processing"    // Audio sent, waiting WS response
  | "idle"          // Turn complete, about to auto-resume
  | "finished";     // Session complete

interface TurnLog {
  turn: number;
  transcript: string;
  bossReply: string;
  damageToBoss: number;
  damageToUser: number;
  fillerCount: number;
}

interface BossChallengeProps {
  sessionId: string;
  bossName: string;
  bossAvatarLetter: string;
  bossColor: string;
  scenario: string;
  personalityName: string;
  maxTurns: number;
  passScore: number;
  greetingText: string;
  greetingAudioB64: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function playBase64Audio(b64: string): Promise<void> {
  return new Promise((resolve) => {
    if (!b64) { resolve(); return; }
    const audio = new Audio(`data:audio/mp3;base64,${b64}`);
    audio.onended = () => resolve();
    audio.onerror = () => resolve(); // non-fatal
    audio.play().catch(() => resolve());
  });
}

const STATUS_LABEL: Record<FightStatus, string> = {
  connecting:     "Đang kết nối...",
  "boss-speaking":"Boss đang nói 🎙️",
  listening:      "Bạn nói đi 👂",
  "user-speaking":"Đang nghe bạn... 🗣️",
  processing:     "Boss đang suy nghĩ ⏳",
  idle:           "Chuẩn bị...",
  finished:       "Kết thúc",
};

const STATUS_COLOR: Record<FightStatus, string> = {
  connecting:     "#94a3b8",
  "boss-speaking":"#7c3aed",
  listening:      "#16a34a",
  "user-speaking":"#ea580c",
  processing:     "#0ea5e9",
  idle:           "#64748b",
  finished:       "#94a3b8",
};

// ─── Animated waveform ────────────────────────────────────────────────────────

function Waveform({ status }: { status: FightStatus }) {
  const active = status === "listening" || status === "user-speaking";
  const bossActive = status === "boss-speaking";
  const color = STATUS_COLOR[status];
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            backgroundColor: color,
            height: (active || bossActive) ? `${6 + (i % 4) * 4}px` : "3px",
            transition: "height 0.15s ease, background-color 0.3s",
            animation: (active || bossActive)
              ? `wave ${0.4 + i * 0.06}s ease-in-out infinite alternate`
              : "none",
          }}
        />
      ))}
      <style>{`@keyframes wave { from { height: 3px; } to { height: 22px; } }`}</style>
    </div>
  );
}

// ─── Damage popup ─────────────────────────────────────────────────────────────

function DamagePopup({ damage, side }: { damage: number; side: "user" | "boss" }) {
  return (
    <div
      className={`absolute top-[-8px] ${side === "boss" ? "right-2" : "left-2"} pointer-events-none z-10`}
      style={{ animation: "floatUp 1.6s ease forwards" }}
    >
      <span className="text-xl font-black text-destructive drop-shadow-sm">
        -{damage} HP
      </span>
      <style>{`@keyframes floatUp { 0% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-40px); } }`}</style>
    </div>
  );
}

// ─── HP bar with shake ────────────────────────────────────────────────────────

function HpBar({ value, label, icon, shake }: { value: number; label: string; icon: React.ReactNode; shake: boolean }) {
  return (
    <div className={shake ? "animate-[shake_0.4s_ease]" : ""}>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }`}</style>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-black">{label}</span>
        <span className="text-xs font-bold text-muted-foreground ml-auto">{value}/100</span>
      </div>
      <Progress
        value={value}
        className="h-2.5"
        style={{ "--progress-color": value > 30 ? undefined : "hsl(var(--destructive))" } as React.CSSProperties}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const BossChallenge = ({
  sessionId,
  bossName,
  bossAvatarLetter,
  bossColor,
  scenario,
  personalityName,
  maxTurns,
  passScore,
  greetingText,
  greetingAudioB64,
}: BossChallengeProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Game state
  const [userHp, setUserHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [turn, setTurn] = useState(0);
  const [status, setStatus] = useState<FightStatus>("connecting");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [turnLogs, setTurnLogs] = useState<TurnLog[]>([]);

  // Result
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [resultData, setResultData] = useState<BossTurnResult | null>(null);

  // HP shake animations
  const [shakeUser, setShakeUser] = useState(false);
  const [shakeBoss, setShakeBoss] = useState(false);
  const [damagePopup, setDamagePopup] = useState<{ key: number; damage: number; side: "user" | "boss" } | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<FightStatus>("connecting");

  const progress = (turn / maxTurns) * 100;
  const passed = (finalScore ?? 0) >= passScore;

  /** Keep statusRef in sync so callbacks don't have stale closure */
  const setStatusSynced = useCallback((s: FightStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  /** Auto-scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Start VAD listening ───────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (!vadRef.current) vadRef.current = new VoiceActivityDetector();

    try {
      await vadRef.current.start(
        // onSpeechEnd — user stopped speaking
        (blob) => {
          if (statusRef.current !== "listening" && statusRef.current !== "user-speaking") return;
          setStatusSynced("processing");
          if (wsRef.current) sendAudioToWs(wsRef.current, blob);
        },
        // onSpeechStart — user started speaking
        () => {
          if (statusRef.current === "listening") setStatusSynced("user-speaking");
        },
      );
      setStatusSynced("listening");
    } catch {
      toast({ title: "Không thể truy cập microphone", variant: "destructive" });
    }
  }, [toast, setStatusSynced]);

  const pauseListening = useCallback(() => {
    vadRef.current?.pause();
  }, []);

  // ─── Handle WS turn result ─────────────────────────────────────────────────

  const handleTurnResult = useCallback(async (result: BossTurnResult) => {
    if (result.type === "processing") {
      setStatusSynced("processing");
      return;
    }
    if (result.type !== "turn_result") return;

    const { transcript, reply, audio_b64, damage_to_boss = 0, damage_to_user = 0,
            filler_count = 0, user_hp, boss_hp, turn: newTurn, is_final,
            score, feedback } = result;

    // Update chat
    if (transcript) {
      setMessages((prev) => [...prev, { role: "user", content: transcript }]);
    }
    if (reply) {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    }

    // Update HP
    const nextUserHp = user_hp ?? Math.max(0, userHp - damage_to_user);
    const nextBossHp = boss_hp ?? Math.max(0, bossHp - damage_to_boss);

    if (damage_to_boss > 0) {
      setDamagePopup({ key: Date.now(), damage: damage_to_boss, side: "boss" });
      setShakeBoss(true);
      setTimeout(() => { setShakeBoss(false); setDamagePopup(null); }, 1800);
    }
    if (damage_to_user > 0) {
      setTimeout(() => {
        setDamagePopup({ key: Date.now() + 1, damage: damage_to_user, side: "user" });
        setShakeUser(true);
        setTimeout(() => { setShakeUser(false); setDamagePopup(null); }, 1800);
      }, 400);
    }

    setUserHp(nextUserHp);
    setBossHp(nextBossHp);
    if (newTurn !== undefined) setTurn(newTurn);

    // Add turn log
    setTurnLogs((prev) => [...prev, {
      turn: newTurn ?? turn + 1,
      transcript: transcript ?? "",
      bossReply: reply ?? "",
      damageToBoss: damage_to_boss,
      damageToUser: damage_to_user,
      fillerCount: filler_count,
    }]);

    // Play boss reply audio
    if (audio_b64) {
      setStatusSynced("boss-speaking");
      pauseListening();
      await playBase64Audio(audio_b64);
    }

    if (is_final) {
      setFinalScore(score ?? null);
      setFinalFeedback(feedback ?? "");
      setResultData(result);
      setStatusSynced("finished");
      return;
    }

    // Resume listening for next turn
    vadRef.current?.resume();
    setStatusSynced("listening");
  }, [userHp, bossHp, turn, pauseListening, setStatusSynced]);

  // ─── Initialize WebSocket + play greeting ─────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Connect WebSocket
        const ws = await openBossWebSocket(
          sessionId,
          (result) => { if (!cancelled) handleTurnResult(result); },
          () => { if (!cancelled) toast({ title: "Mất kết nối với Boss", variant: "destructive" }); },
          () => { if (!cancelled && statusRef.current !== "finished") {
            toast({ title: "Kết nối đóng, bạn có thể thử lại.", variant: "destructive" });
          }},
        );
        if (cancelled) { ws.close(); return; }
        wsRef.current = ws;

        // Show greeting in chat
        setMessages([{ role: "assistant", content: greetingText }]);

        // Play greeting audio
        setStatusSynced("boss-speaking");
        await playBase64Audio(greetingAudioB64);
        if (cancelled) return;

        // Start VAD listening
        await startListening();
      } catch (e) {
        if (!cancelled) {
          toast({ title: "Không thể bắt đầu Boss Fight", description: String(e), variant: "destructive" });
          setStatusSynced("idle");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      vadRef.current?.stop();
      wsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ─── Manual finish ─────────────────────────────────────────────────────────

  const handleFinishEarly = () => {
    if (wsRef.current) sendWsControl(wsRef.current, "finish");
    setStatusSynced("processing");
  };

  // ─── Result screen ─────────────────────────────────────────────────────────

  if (status === "finished") {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 max-w-2xl">
          <div className="bg-card neo-border neo-shadow rounded-sm p-8 text-center space-y-6">
            <div
              className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl"
              style={{ backgroundColor: passed ? "#dcfce7" : "#fee2e2", border: "3px solid black" }}
            >
              {passed ? "🏆" : "💪"}
            </div>
            <div>
              <h2 className="text-3xl font-black">{passed ? "Boss bị đánh bại! 🎉" : "Thử lại nào! 💪"}</h2>
              <p className="text-muted-foreground text-sm mt-1">{bossName} · {personalityName}</p>
            </div>

            <div className="text-6xl font-black" style={{ color: passed ? "#16a34a" : "#dc2626" }}>
              {finalScore ?? "--"}/100
            </div>

            {/* Score breakdown */}
            {resultData && (
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Lưu loát", val: resultData.fluency_score },
                  { label: "Tự tin", val: resultData.confidence_score },
                  { label: "Nội dung", val: resultData.content_score },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-muted neo-border rounded-sm p-3">
                    <p className="text-xs font-black text-muted-foreground uppercase">{label}</p>
                    <p className="text-2xl font-black">{val ? Math.round(val) : "--"}</p>
                  </div>
                ))}
              </div>
            )}

            {/* HP summary */}
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="bg-muted neo-border rounded-sm p-4">
                <p className="text-xs font-black uppercase text-muted-foreground mb-2">HP của bạn</p>
                <Progress value={userHp} className="h-3 mb-1" />
                <p className="text-sm font-bold">{userHp}/100</p>
              </div>
              <div className="bg-muted neo-border rounded-sm p-4">
                <p className="text-xs font-black uppercase text-muted-foreground mb-2">HP Boss</p>
                <Progress value={bossHp} className="h-3 mb-1" />
                <p className="text-sm font-bold">{bossHp}/100</p>
              </div>
            </div>

            {/* Filler words */}
            {resultData?.filler_total !== undefined && resultData.filler_total > 0 && (
              <p className="text-sm text-muted-foreground neo-border bg-muted rounded-sm p-3">
                ⚠️ Bạn dùng <strong>{resultData.filler_total}</strong> từ đệm (ừm, à, ờ...) trong toàn bộ cuộc trò chuyện
              </p>
            )}

            {/* Turn history */}
            <div className="text-left space-y-2">
              <p className="text-xs font-black uppercase text-muted-foreground">Lịch sử trận đấu</p>
              {turnLogs.map((r) => (
                <div key={r.turn} className="bg-muted rounded-sm p-3 text-xs neo-border">
                  <div className="flex justify-between mb-1 gap-2 flex-wrap">
                    <span className="font-black">Lượt {r.turn}</span>
                    {r.damageToBoss > 0 && <span className="text-primary font-bold">⚔️ -{r.damageToBoss} Boss HP</span>}
                    {r.damageToUser > 0 && <span className="text-destructive font-bold">🩸 -{r.damageToUser} HP bạn</span>}
                    {r.fillerCount > 0 && <span className="text-amber-600 font-bold">💬 {r.fillerCount} từ đệm</span>}
                  </div>
                  <p className="text-muted-foreground italic break-words">"{r.transcript}"</p>
                </div>
              ))}
            </div>

            <p className="text-base font-bold bg-muted neo-border rounded-sm p-4 text-left">
              {finalFeedback}
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/roadmap")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Về Bản đồ
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Fight screen ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 max-w-3xl">
        {/* Back */}
        <div className="flex items-center gap-3 mb-4 pt-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/roadmap")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-black">Boss Fight</h1>
            <p className="text-xs text-muted-foreground">{personalityName}</p>
          </div>
          {turn > 0 && turn < maxTurns && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-xs"
              onClick={handleFinishEarly}
            >
              Kết thúc sớm
            </Button>
          )}
        </div>

        {/* HP bars */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="relative">
              {damagePopup?.side === "user" && (
                <DamagePopup damage={damagePopup.damage} side="user" key={damagePopup.key} />
              )}
              <HpBar value={userHp} label="Bạn" shake={shakeUser}
                icon={<Shield className="w-4 h-4 text-primary" />} />
            </div>
            <div className="relative">
              {damagePopup?.side === "boss" && (
                <DamagePopup damage={damagePopup.damage} side="boss" key={damagePopup.key} />
              )}
              <HpBar value={bossHp} label={bossName} shake={shakeBoss}
                icon={<Swords className="w-4 h-4 text-destructive" />} />
            </div>
          </div>
          {/* Turn progress */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground mb-1">
              <span>Lượt {turn}/{maxTurns}</span>
              <span style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </div>

        {/* Boss avatar */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-4 mb-4 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ backgroundColor: bossColor, border: "3px solid black" }}
          >
            {bossAvatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">{bossName}</p>
            <p className="text-xs text-muted-foreground truncate">{scenario}</p>
          </div>
          {status === "boss-speaking" && (
            <Volume2 className="w-5 h-5 text-primary animate-pulse flex-shrink-0" />
          )}
        </div>

        {/* Chat messages */}
        <div className="space-y-3 mb-4 max-h-[38vh] overflow-y-auto pr-1 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] px-4 py-3 neo-border rounded-sm text-sm font-medium leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {status === "processing" && (
            <div className="flex justify-start">
              <div className="bg-muted neo-border rounded-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Boss đang suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Status panel */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-5 sticky bottom-4">
          <div className="flex flex-col items-center gap-4">
            <Waveform status={status} />

            <div
              className="text-center px-4 py-2 rounded-full text-xs font-black"
              style={{
                backgroundColor: `${STATUS_COLOR[status]}22`,
                color: STATUS_COLOR[status],
                border: `2px solid ${STATUS_COLOR[status]}`,
              }}
            >
              {STATUS_LABEL[status]}
            </div>

            {status === "listening" && (
              <p className="text-xs text-muted-foreground text-center">
                🟢 Đang lắng nghe — Nói tự nhiên, tự động gửi khi bạn dừng lại
              </p>
            )}
            {status === "connecting" && (
              <p className="text-xs text-muted-foreground text-center flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang kết nối với Boss Fight...
              </p>
            )}
            {status === "idle" && (
              <Button size="sm" onClick={startListening}>
                <Mic className="w-4 h-4 mr-2" />
                Bắt đầu nói
              </Button>
            )}
            {(status === "listening" || status === "user-speaking") && (
              <p className="text-[11px] text-muted-foreground">
                Tự động nhận giọng nói — Không cần bấm nút
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BossChallenge;