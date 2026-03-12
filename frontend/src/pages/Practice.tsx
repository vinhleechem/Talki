import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, RotateCcw, Mic, Star, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { useProgress } from "@/hooks/useProgress";

const DEMO_SUBTITLE = "Xin chào, tôi là Minh. Rất vui được gặp bạn!";
const DEMO_SUBTITLE_EN = "(Hello, I am Minh. Very nice to meet you!)";

const Practice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { scene, stage } = location.state || {};
  const { updateProgress } = useProgress();

  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [score, setScore] = useState({ content: 0, fluency: 0, emotion: 0, overall: 0 });

  if (!scene || !stage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/roadmap")}>Quay về bản đồ</Button>
      </div>
    );
  }

  const handleStartRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setHasRecorded(true);
      setScore({ content: 82, fluency: 90, emotion: 75, overall: 4 });
    }, 3000);
  };

  const handleRetry = () => {
    setHasRecorded(false);
    setIsRecording(false);
    setScore({ content: 0, fluency: 0, emotion: 0, overall: 0 });
  };

  const handleComplete = async () => {
    const stars = Math.floor(Math.random() * 3) + 3;
    await updateProgress(stage.id, scene.id, true, stars);
    toast({
      title: "Hoàn thành bài học! 🎉",
      description: `Bạn đạt ${stars} sao! Quay lại bản đồ để tiếp tục.`,
    });
    navigate("/roadmap");
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/roadmap")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">{scene.title}</h1>
            <p className="text-sm font-bold text-muted-foreground">
              {stage.title} · Cảnh {scene.id}
            </p>
          </div>
        </div>

        {/* ── Guidelines (kept at top) ── */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-8">
          <h2 className="text-base font-black uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
            📚 Hướng dẫn
          </h2>
          <div className="space-y-2 text-foreground">
            <p className="font-medium">
              ✨ <strong>Mục tiêu:</strong> Luyện nói đúng tình huống thực tế trong bài học này.
            </p>
            <p className="font-medium">
              🎯 <strong>Tình huống:</strong>{" "}
              {scene.question ?? "Hãy tưởng tượng bạn đang ở trong tình huống của bài và nói như ngoài đời thật."}
            </p>
            <p className="font-medium">
              💡 <strong>Lưu ý:</strong> Nói rõ ràng, tốc độ vừa phải và giữ cảm xúc tự nhiên.
            </p>
          </div>
        </div>

        {/* ── Step 01: LEARN ── */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-sm bg-foreground text-background flex items-center justify-center font-black text-sm neo-border flex-shrink-0">
              01
            </span>
            <h2 className="font-black uppercase tracking-widest text-sm text-foreground">Learn: Watch &amp; Listen</h2>
          </div>

          <div className="neo-border neo-shadow rounded-sm overflow-hidden">
            {/* Video mock */}
            <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
              <button className="w-16 h-16 rounded-full bg-primary flex items-center justify-center neo-border hover:scale-105 transition-transform">
                <Play className="w-7 h-7 text-primary-foreground fill-primary-foreground ml-1" />
              </button>
              {/* Subtitle overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 text-center">
                <p className="text-white font-bold italic text-base">"{DEMO_SUBTITLE}"</p>
                <p className="text-zinc-400 text-xs mt-1 uppercase tracking-wide">{DEMO_SUBTITLE_EN}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Step 02: ACTION ── */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-sm bg-foreground text-background flex items-center justify-center font-black text-sm neo-border flex-shrink-0">
              02
            </span>
            <h2 className="font-black uppercase tracking-widest text-sm text-foreground">Action: Your Turn</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Situation card */}
            <div className="neo-border neo-shadow rounded-sm p-5 bg-card flex flex-col justify-between min-h-[180px]">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-primary" />
                  The Situation
                </p>
                <p className="font-medium text-foreground leading-relaxed">
                  {scene.question ?? "Hãy nói như thể bạn đang ở trong tình huống thực tế. Tự nhiên và tự tin nhé!"}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-primary font-black text-sm">
                <Zap className="w-4 h-4 fill-primary" />
                -1 Energy
              </div>
            </div>

            {/* Recording card */}
            <div className="neo-border neo-shadow rounded-sm p-5 bg-card flex flex-col items-center justify-center min-h-[180px] gap-4">
              {hasRecorded ? (
                <>
                  <p className="font-black text-lg text-secondary text-center">Đã ghi âm! ✓</p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Ghi lại
                  </button>
                </>
              ) : (
                <>
                  <p className="font-black uppercase tracking-widest text-foreground text-center">
                    {isRecording ? "Đang nghe..." : "Ready to Speak?"}
                  </p>
                  {!isRecording && (
                    <p className="text-xs text-muted-foreground uppercase tracking-wide -mt-2">
                      Nhấn nút và nói: "{scene.title}"
                    </p>
                  )}
                  <button
                    onClick={handleStartRecording}
                    disabled={isRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center neo-border transition-all ${
                      isRecording
                        ? "bg-destructive text-destructive-foreground animate-pulse neo-shadow"
                        : "bg-primary text-primary-foreground hover:translate-x-[3px] hover:translate-y-[3px] neo-shadow hover:shadow-none"
                    }`}
                  >
                    <Mic className="w-8 h-8" />
                  </button>
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">
                    {isRecording ? "Đang ghi âm..." : "Press to Record"}
                  </p>
                  {/* Waveform mock */}
                  <div className="flex items-end gap-[3px] h-6">
                    {[3, 6, 10, 7, 4, 8, 5, 10, 6, 3].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all ${
                          isRecording ? "bg-primary animate-pulse" : "bg-muted-foreground"
                        }`}
                        style={{ height: `${h * (isRecording ? 2.4 : 1.6)}px` }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Step 03: FEEDBACK ── */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-sm bg-foreground text-background flex items-center justify-center font-black text-sm neo-border flex-shrink-0">
              03
            </span>
            <h2 className="font-black uppercase tracking-widest text-sm text-foreground">Feedback: AI Analysis</h2>
          </div>

          <div className="neo-border neo-shadow rounded-sm p-6 bg-card">
            {!hasRecorded ? (
              /* Locked state */
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="grid grid-cols-3 gap-4 w-full mb-2">
                  {["Content Score", "Fluency", "Emotion / Tone"].map((label) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        {label}
                      </span>
                      <div className="w-full h-2 bg-muted neo-border rounded-full" />
                      <span className="text-lg font-black text-muted-foreground">—</span>
                    </div>
                  ))}
                </div>
                <button
                  disabled
                  className="px-6 py-2 bg-muted text-muted-foreground font-black uppercase tracking-widest text-xs neo-border rounded-sm cursor-not-allowed"
                >
                  Complete Step 2 to View
                </button>
                <div className="flex gap-2 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-muted-foreground" />
                  ))}
                </div>
              </div>
            ) : (
              /* Revealed state */
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Content Score", value: score.content },
                    { label: "Fluency", value: score.fluency },
                    { label: "Emotion / Tone", value: score.emotion },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                        {label}
                      </span>
                      <div className="w-full h-2 bg-muted neo-border rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-700" style={{ width: `${value}%` }} />
                      </div>
                      <span className="text-xl font-black text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Overall stars */}
                <div className="flex justify-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-7 h-7 ${i < score.overall ? "text-primary fill-primary" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>

                {/* AI feedback text */}
                <div className="bg-secondary/10 neo-border rounded-sm p-4">
                  <p className="font-bold text-foreground text-sm leading-relaxed">
                    💬 <strong>Nhận xét:</strong> Tuyệt vời! Giọng bạn rất tự nhiên và rõ ràng. Cảm xúc phù hợp với tình
                    huống. Tiếp tục duy trì nhé!
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleRetry} className="flex-1 font-bold">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Thử lại
                  </Button>
                  <Button variant="secondary" onClick={handleComplete} className="flex-1 font-bold">
                    Tiếp tục →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Practice;
