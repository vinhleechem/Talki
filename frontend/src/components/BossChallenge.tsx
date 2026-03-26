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
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/utils/voiceRecorder";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TurnResult {
  turn: number;
  userTranscript: string;
  bossReply: string;
  damage: number;      // damage dealt to boss
  bossHeal: number;    // hp boss recovers (good reply = 0, weak reply = some)
  fillerCount: number;
}

interface BossChallengeProps {
  bossName: string;
  bossAvatarLetter: string;
  bossColor: string;
  scenario: string;
  scenarioName: string;
  personality: string;
  personalityName: string;
  stageId: number;
  maxTurns?: number;
  passScore?: number;
}

// ─── Mock service helpers (to be replaced by real API calls) ──────────────────

async function mockBossChat(
  messages: { role: "user" | "assistant"; content: string }[],
  scenario: string,
  personality: string,
  shouldEvaluate: boolean
): Promise<{ reply: string; damage: number; bossHeal: number; fillerCount: number; score?: number; feedback?: string }> {
  // Simulated delay
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

  if (shouldEvaluate) {
    return {
      reply: "Được rồi, tôi đã lắng nghe bạn xuyên suốt cuộc trò chuyện này. Bạn đã thể hiện khá tốt!",
      damage: 0,
      bossHeal: 0,
      fillerCount: 0,
      score: 72,
      feedback: "Bạn giao tiếp tự nhiên và mạch lạc. Cần giảm bớt từ đệm như 'ừm', 'à'. Rất tốt cho lần đầu!",
    };
  }

  const lastUserMsg = messages[messages.length - 1]?.content ?? "";
  const wordCount = lastUserMsg.split(/\s+/).filter(Boolean).length;
  const damage = Math.min(30, Math.max(5, wordCount * 2));
  const fillerCount = Math.floor(Math.random() * 3);

  const replies = [
    "Thú vị đấy! Bạn có thể nói thêm về điều đó không?",
    "Tôi hiểu ý bạn. Nhưng theo tôi thì...",
    "Hmm, đó là một quan điểm đáng suy nghĩ. Thế còn...",
    "Tôi đồng ý một phần, nhưng bạn có thể giải thích rõ hơn không?",
    "OK, vậy nếu tôi đặt câu hỏi thế này thì sao?",
  ];
  const reply = replies[Math.floor(Math.random() * replies.length)];

  return { reply, damage, bossHeal: fillerCount * 3, fillerCount };
}

async function mockTranscribeAudio(_blob: Blob): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  const phrases = [
    "Tôi nghĩ rằng điều này rất quan trọng với tôi",
    "Có, tôi hoàn toàn đồng ý với quan điểm đó",
    "Thực ra thì tôi có một câu hỏi muốn hỏi bạn",
    "Đó là một tình huống khá thú vị, không ngờ lại gặp nhau ở đây",
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ─── Animated waveform ───────────────────────────────────────────────────────

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          style={{
            height: active ? `${8 + Math.random() * 16}px` : "4px",
            transition: active ? `height ${0.1 + i * 0.03}s ease` : "height 0.3s ease",
            animation: active ? `wave 0.${5 + i}s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { height: 4px; }
          to { height: 22px; }
        }
      `}</style>
    </div>
  );
}

// ─── Damage popup ─────────────────────────────────────────────────────────────

function DamagePopup({ damage, side }: { damage: number; side: "user" | "boss" }) {
  return (
    <div
      className={`absolute top-0 ${side === "boss" ? "right-4" : "left-4"} pointer-events-none`}
      style={{ animation: "floatUp 1.5s ease forwards" }}
    >
      <span className="text-2xl font-black text-destructive">-{damage} HP</span>
      <style>{`@keyframes floatUp { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-50px); } }`}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const BossChallenge = ({
  bossName,
  bossAvatarLetter,
  bossColor,
  scenario,
  personality,
  personalityName,
  stageId,
  maxTurns = 7,
  passScore = 60,
}: BossChallengeProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // HP
  const [userHp, setUserHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);

  // conversation
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [turnResults, setTurnResults] = useState<TurnResult[]>([]);
  const [turn, setTurn] = useState(0);

  // audio
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);

  // result
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [showResult, setShowResult] = useState(false);

  // refs
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // damage popups
  const [damagePopup, setDamagePopup] = useState<{ key: number; damage: number; side: "user" | "boss" } | null>(null);

  const progress = (turn / maxTurns) * 100;
  const passed = (finalScore ?? 0) >= passScore;

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // init voice recorder
  useEffect(() => {
    voiceRecorderRef.current = new VoiceRecorder();
    return () => {
      if (voiceRecorderRef.current?.isRecording()) {
        voiceRecorderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Opening boss message
  useEffect(() => {
    const opener = `Xin chào! Tôi là ${bossName}. ${scenario}. Hãy bắt đầu cuộc trò chuyện nào!`;
    setMessages([{ role: "assistant", content: opener }]);
  }, [bossName, scenario]);

  // ─── Record ───────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!voiceRecorderRef.current) return;
    try {
      await voiceRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Không thể truy cập microphone", variant: "destructive" });
    }
  }, [toast]);

  const stopRecording = useCallback(async () => {
    if (!voiceRecorderRef.current?.isRecording()) return;
    setIsRecording(false);
    setIsProcessing(true);
    try {
      const blob = await voiceRecorderRef.current.stop();
      // Transcribe (mock)
      const transcript = await mockTranscribeAudio(blob);
      setPendingTranscript(transcript);
    } catch {
      toast({ title: "Lỗi xử lý âm thanh", variant: "destructive" });
      setIsProcessing(false);
    }
  }, [toast]);

  // When we have a transcript, send to boss
  useEffect(() => {
    if (!pendingTranscript) return;

    const userMsg = { role: "user" as const, content: pendingTranscript };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setPendingTranscript(null);

    const isLastTurn = turn >= maxTurns - 1;

    mockBossChat(newMessages, scenario, personality, isLastTurn).then((result) => {
      const bossMsg = { role: "assistant" as const, content: result.reply };
      setMessages((prev) => [...prev, bossMsg]);

      // Update HP
      const newBossHp = Math.max(0, bossHp - result.damage + result.bossHeal);
      const userDmg = result.fillerCount > 0 ? result.fillerCount * 5 : 0;
      const newUserHp = Math.max(0, userHp - userDmg);
      setBossHp(newBossHp);
      setUserHp(newUserHp);

      // Damage popup
      if (result.damage > 0) {
        setDamagePopup({ key: Date.now(), damage: result.damage, side: "boss" });
        setTimeout(() => setDamagePopup(null), 1600);
      }

      setTurnResults((prev) => [
        ...prev,
        {
          turn: turn + 1,
          userTranscript: pendingTranscript ?? userMsg.content,
          bossReply: result.reply,
          damage: result.damage,
          bossHeal: result.bossHeal,
          fillerCount: result.fillerCount,
        },
      ]);

      setTurn((t) => t + 1);

      if (isLastTurn && result.score !== undefined) {
        setFinalScore(result.score);
        setFinalFeedback(result.feedback ?? "");
        setShowResult(true);
        saveBossChallenge(result.score, newMessages, result.feedback ?? "");
      }
    }).catch(() => {
      toast({ title: "Lỗi kết nối Boss", variant: "destructive" });
    }).finally(() => {
      setIsProcessing(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTranscript]);

  const saveBossChallenge = async (score: number, conversation: typeof messages, feedback: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("boss_challenges").insert({
        user_id: user.id,
        stage_id: stageId,
        scenario: scenario,
        personality: personalityName,
        conversation_history: conversation,
        score,
        completed: true,
        passed: score >= passScore,
        feedback,
      });
    } catch (err) {
      console.error("Failed to save boss challenge", err);
    }
  };

  // ─── Result screen ────────────────────────────────────────────────────────

  if (showResult) {
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
              <h2 className="text-3xl font-black">
                {passed ? "Boss bị đánh bại! 🎉" : "Thử lại nào! 💪"}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">{bossName} • {personalityName}</p>
            </div>

            <div
              className="text-6xl font-black"
              style={{ color: passed ? "#16a34a" : "#dc2626" }}
            >
              {finalScore}/100
            </div>

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

            {/* Turn summary */}
            <div className="text-left space-y-2">
              <p className="text-xs font-black uppercase text-muted-foreground">Lịch sử trận đấu</p>
              {turnResults.map((r) => (
                <div key={r.turn} className="bg-muted rounded-sm p-3 text-xs neo-border">
                  <div className="flex justify-between mb-1">
                    <span className="font-black">Lượt {r.turn}</span>
                    <span className="text-primary font-bold">-{r.damage} HP Boss</span>
                    {r.fillerCount > 0 && <span className="text-destructive font-bold">-{r.fillerCount * 5} HP bạn</span>}
                  </div>
                  <p className="text-muted-foreground italic">"{r.userTranscript}"</p>
                </div>
              ))}
            </div>

            <p className="text-base font-bold text-foreground bg-muted neo-border rounded-sm p-4">
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
                onClick={() => {
                  setShowResult(false);
                  setTurn(0);
                  setUserHp(100);
                  setBossHp(100);
                  setMessages([{ role: "assistant", content: `Tôi là ${bossName}. ${scenario}. Hãy bắt đầu lại nào!` }]);
                  setTurnResults([]);
                  setFinalScore(null);
                }}
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

  // ─── Main fight screen ────────────────────────────────────────────────────

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
            <h1 className="text-xl font-black text-foreground">Boss Fight</h1>
            <p className="text-xs text-muted-foreground">{personalityName}</p>
          </div>
        </div>

        {/* HP bars */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-black">Bạn</span>
                <span className="text-xs font-bold text-muted-foreground ml-auto">{userHp}/100</span>
              </div>
              <Progress value={userHp} className="h-2.5" />
            </div>
            <div className="relative">
              {damagePopup && <DamagePopup damage={damagePopup.damage} side={damagePopup.side} />}
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-4 h-4 text-destructive" />
                <span className="text-xs font-black">{bossName}</span>
                <span className="text-xs font-bold text-muted-foreground ml-auto">{bossHp}/100</span>
              </div>
              <Progress value={bossHp} className="h-2.5 [&>div]:bg-destructive" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground mb-1">
              <span>Lượt {turn}/{maxTurns}</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </div>

        {/* Boss avatar + scenario */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-4 mb-4 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ backgroundColor: bossColor, border: "3px solid black" }}
          >
            {bossAvatarLetter}
          </div>
          <div>
            <p className="font-black text-sm">{bossName}</p>
            <p className="text-xs text-muted-foreground">{personalityName}</p>
          </div>
        </div>

        {/* Chat messages */}
        <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto pr-1">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 neo-border rounded-sm text-sm font-medium ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-muted neo-border rounded-sm px-4 py-3 text-sm text-muted-foreground">
                Boss đang phân tích...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Recording controls */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-5 sticky bottom-4">
          <div className="flex flex-col items-center gap-4">
            <Waveform active={isRecording} />

            <p className="text-xs text-center text-muted-foreground font-bold">
              {isRecording
                ? "🔴 Đang ghi âm... Nhấn để dừng"
                : isProcessing
                  ? "⏳ Đang xử lý giọng nói..."
                  : turn === 0
                    ? "Nhấn giữ để ghi âm câu trả lời đầu tiên"
                    : `Lượt ${turn + 1}/${maxTurns} — Nói phản hồi của bạn`}
            </p>

            <Button
              size="lg"
              variant={isRecording ? "destructive" : "secondary"}
              className="w-full max-w-xs h-14 text-base font-black"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || showResult}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Dừng ghi âm
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  {isProcessing ? "Đang xử lý..." : "Bắt đầu nói"}
                </>
              )}
            </Button>

            {turn >= maxTurns && !showResult && (
              <Button
                variant="hero"
                className="w-full max-w-xs"
                onClick={() => setShowResult(true)}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Xem kết quả
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BossChallenge;