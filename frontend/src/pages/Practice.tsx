import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, RotateCcw, Mic, Star, Zap, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useProgress } from "@/hooks/useProgress";
import { lessonService } from "@/services/lessonService";
import { useAchievementToast } from "@/hooks/useAchievementToast";
import { useUser } from "@/contexts/UserContext";
import type { ExtractedMistake } from "@/types";

const DEMO_SUBTITLE = "Xin chào, tôi là Minh. Rất vui được gặp bạn!";
const DEMO_SUBTITLE_EN = "(Hello, I am Minh. Very nice to meet you!)";

const Practice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { lesson, chapter } = location.state || {};
  const { updateProgress } = useProgress();
  const showAchievements = useAchievementToast();
  const { profile, hearts, refresh } = useUser();

  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState({ content: 0, fluency: 0, emotion: 0, overall: 0 });
  const [feedbackText, setFeedbackText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [detailFeedback, setDetailFeedback] = useState({ content: "", speed: "", emotion: "", advice: "" });
  const [mistakes, setMistakes] = useState<ExtractedMistake[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!lesson || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/roadmap")}>Quay về bản đồ</Button>
      </div>
    );
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsLoading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });

        const lessonId: string | undefined = lesson?.id;
        if (!lessonId) {
          setIsLoading(false);
          toast({
            title: "Lỗi",
            description: "Bài học không có ID hợp lệ để gửi AI chấm điểm.",
            variant: "destructive",
          });
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        try {
          const res = await lessonService.submitAudioPractice(lessonId, audioBlob);
          setScore({
            content: Math.round(res.content_score * 10),
            fluency: Math.round(res.speed_score * 10),
            emotion: Math.round(res.emotion_score * 10),
            overall: Math.round((res.overall_score / 100) * 5), // map 0-100 to 0-5
          });
          setFeedbackText(res.feedback_text || "AI chưa trả về nhận xét chi tiết.");
          setTranscript(res.transcript || "");
          setDetailFeedback({
            content: res.content_feedback || "",
            speed: res.speed_feedback || "",
            emotion: res.emotion_feedback || "",
            advice: res.advice_text || "",
          });
          setMistakes(res.extracted_mistakes || []);
          setHasRecorded(true);
        } catch (error: unknown) {
          console.error(error);
          const rawMessage = error instanceof Error ? error.message : "Lỗi khi chấm điểm kết quả thu âm.";

          // Xử lý riêng trường hợp hết năng lượng từ backend
          const isNoEnergy =
            typeof rawMessage === "string" &&
            rawMessage.toLowerCase().includes("no energy remaining");

          const errorMessage = isNoEnergy
            ? "Bạn đã hết năng lượng cho hôm nay. Hãy chờ hồi phục hoặc nâng cấp gói để tiếp tục luyện tập."
            : rawMessage;

          toast({
            title: "Lỗi",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          // Backend trừ năng lượng từ đầu flow; luôn refresh để đồng bộ số hiển thị
          await refresh();
          setIsLoading(false);
          // Stop stream tracks
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      toast({
        title: "Lỗi Microphone",
        description: "Vui lòng cấp quyền sử dụng microphone để tiếp tục.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRetry = () => {
    setHasRecorded(false);
    setIsRecording(false);
    setScore({ content: 0, fluency: 0, emotion: 0, overall: 0 });
    setFeedbackText("");
    setTranscript("");
    setDetailFeedback({ content: "", speed: "", emotion: "", advice: "" });
    setMistakes([]);
    audioChunksRef.current = [];
  };

  const handleComplete = async () => {
    try {
      const lessonId: string | undefined = lesson?.id;

      const stars = score.overall || 4;

      if (lessonId) {
        const res = await lessonService.completeLesson(lessonId, 100);
        if (res.newly_unlocked_achievements?.length > 0) {
          showAchievements(res.newly_unlocked_achievements);
        }
      } else {
        toast({
          title: "Lỗi",
          description: "Bài học không có ID hợp lệ.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Hoàn thành bài học! 🎉",
        description: `Bạn đạt ${stars} sao! Quay lại bản đồ để tiếp tục.`,
      });
      navigate("/roadmap");
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu kết quả bài học. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Map-style header (giữ nguyên khi vào bài học) */}
      <header className="sticky top-0 z-50 w-full bg-card neo-border-b flex items-center justify-between px-4 md:px-10 h-16">
        <button
          onClick={() => navigate("/roadmap")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="bg-primary neo-border neo-shadow-sm w-10 h-10 flex items-center justify-center">
            <span className="text-xl font-black text-primary-foreground">T</span>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Talki Map</h1>
        </button>

        <div className="flex items-center gap-3">
          {/* Energy */}
          <div className="flex items-center gap-1.5 bg-yellow-400 neo-border neo-shadow-sm px-3 py-1">
            <Zap className="w-4 h-4 fill-black text-black" />
            <span className="font-black text-sm text-black">{hearts}/20</span>
          </div>
          {/* Points (mock) */}
          <div className="hidden sm:flex items-center gap-1.5 bg-primary neo-border neo-shadow-sm px-3 py-1">
            <Star className="w-4 h-4 fill-white text-white" />
            <span className="font-black text-sm text-white">1,240</span>
          </div>
          {/* Avatar */}
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 neo-border neo-shadow-sm bg-muted flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-8 max-w-4xl">
        {/* Header bài học */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/roadmap")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">{lesson.title}</h1>
            <p className="text-sm font-bold text-muted-foreground">
              {chapter.title}
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
              {lesson.action_prompt ?? "Hãy tưởng tượng bạn đang ở trong tình huống của bài và nói như ngoài đời thật."}
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
                  {lesson.action_prompt ?? "Hãy nói như thể bạn đang ở trong tình huống thực tế. Tự nhiên và tự tin nhé!"}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-primary font-black text-sm">
                <Zap className="w-4 h-4 fill-primary" />
                -1 Energy
              </div>
            </div>

            {/* Recording card */}
            <div className="neo-border neo-shadow rounded-sm p-5 bg-card flex flex-col items-center justify-center min-h-[200px] gap-4">
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
                    {isLoading ? "Đang chấm điểm..." : isRecording ? "Đang ghi âm (nhấn lại để dừng)" : "Ready to Speak?"}
                  </p>
                  {!isRecording && !isLoading && (
                    <p className="text-xs text-muted-foreground uppercase tracking-wide -mt-2">
                      Nhấn nút và nói: "{lesson.title}"
                    </p>
                  )}
                  <div className="relative flex items-center justify-center">
                    {/* Vòng sóng ngoài khi đang ghi */}
                    {isRecording && !isLoading && (
                      <div className="absolute w-28 h-28 rounded-full border-4 border-primary/40 animate-ping" />
                    )}
                    {/* Vòng trung gian */}
                    {isRecording && !isLoading && (
                      <div className="absolute w-24 h-24 rounded-full border-2 border-primary/60 animate-[pulse_1.4s_ease-in-out_infinite]" />
                    )}
                    {/* Nút chính */}
                    <button
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={isLoading}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center neo-border transition-all ${
                        isLoading
                          ? "bg-muted text-muted-foreground"
                          : isRecording
                          ? "bg-destructive text-destructive-foreground neo-shadow"
                          : "bg-primary text-primary-foreground hover:translate-x-[3px] hover:translate-y-[3px] neo-shadow hover:shadow-none"
                      }`}
                    >
                      <Mic className="w-8 h-8" />
                    </button>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">
                    {isLoading ? "Vui lòng chờ..." : isRecording ? "Đang ghi..." : "Press to Record"}
                  </p>
                  {/* Waveform mock */}
                  <div className="flex items-end gap-[3px] h-6">
                    {[3, 6, 10, 7, 4, 8, 5, 10, 6, 3].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all ${
                          isRecording
                            ? "bg-primary animate-[bounce_0.8s_ease-in-out_infinite]"
                            : "bg-muted-foreground"
                        }`}
                        style={{ height: `${h * (isRecording ? 2.4 : 1.4)}px` }}
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
                  <p className="font-bold text-foreground text-sm leading-relaxed whitespace-pre-line">
                    💬 <strong>Nhận xét:</strong> {feedbackText}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { title: "Nội dung", value: detailFeedback.content },
                    { title: "Độ trôi chảy", value: detailFeedback.speed },
                    { title: "Cảm xúc", value: detailFeedback.emotion },
                  ].map((item) => (
                    <div key={item.title} className="bg-muted/30 neo-border rounded-sm p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{item.title}</p>
                      <p className="font-medium text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {item.value || "AI chưa trả về nhận xét cho mục này."}
                      </p>
                    </div>
                  ))}
                </div>

                {transcript && (
                  <div className="bg-muted/40 neo-border rounded-sm p-4">
                    <p className="font-bold text-foreground text-sm leading-relaxed whitespace-pre-line">
                      🎙️ <strong>AI nghe được:</strong> {transcript}
                    </p>
                  </div>
                )}

                {detailFeedback.advice && (
                  <div className="bg-primary/10 neo-border rounded-sm p-4">
                    <p className="font-bold text-foreground text-sm leading-relaxed whitespace-pre-line">
                      🎯 <strong>Gợi ý cải thiện:</strong> {detailFeedback.advice}
                    </p>
                  </div>
                )}

                {mistakes.length > 0 && (
                  <div className="bg-card neo-border rounded-sm p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">AI phát hiện điểm cần sửa</p>
                    <div className="space-y-3">
                      {mistakes.map((mistake, index) => (
                        <div key={`${mistake.word_or_phrase}-${index}`} className="border-l-4 border-primary pl-3">
                          <p className="font-bold text-sm text-foreground">{mistake.word_or_phrase}</p>
                          <p className="text-sm text-muted-foreground">
                            {mistake.type ? `Loại lỗi: ${mistake.type}` : "AI chưa phân loại lỗi."}
                          </p>
                          {mistake.correction && (
                            <p className="text-sm text-foreground">Gợi ý sửa: {mistake.correction}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
