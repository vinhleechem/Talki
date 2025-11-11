import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, RotateCcw, Volume2, Mic, Star } from "lucide-react";
import Navbar from "@/components/Navbar";

const Practice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scene, stage } = location.state || {};

  const [isRecording, setIsRecording] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [score, setScore] = useState({ speed: 0, pronunciation: 0, overall: 0 });

  if (!scene || !stage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/roadmap")}>Quay về bản đồ</Button>
      </div>
    );
  }

  const handleStartRecording = () => {
    setIsRecording(true);
    // Mock recording - in real app, would use Web Speech API
    setTimeout(() => {
      setIsRecording(false);
      setHasCompleted(true);
      setScore({
        speed: 4,
        pronunciation: 5,
        overall: 4.5,
      });
    }, 3000);
  };

  const handleRetry = () => {
    setHasCompleted(false);
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/roadmap")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {scene.title}
            </h1>
            <p className="text-sm font-bold text-muted-foreground">
              {stage.title} - Cảnh {scene.id}
            </p>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
          <h2 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
            📚 Hướng dẫn
          </h2>
          <div className="space-y-3 text-foreground">
            <p className="font-medium">
              ✨ <strong>Mục tiêu:</strong> Học cách chào hỏi tự nhiên và thân thiện
            </p>
            <p className="font-medium">
              💡 <strong>Gợi ý:</strong> Giọng điệu vui vẻ, nhìn vào mắt đối phương, mỉm cười nhẹ
            </p>
            <p className="font-medium">
              🎯 <strong>Ví dụ:</strong> "Xin chào! Rất vui được gặp bạn!"
            </p>
          </div>
        </div>

        {/* Video Section (Mock) */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-6 mb-6">
          <div className="aspect-video bg-muted neo-border rounded-sm flex items-center justify-center mb-4">
            <Play className="w-16 h-16 text-muted-foreground" />
          </div>
          <Button variant="secondary" className="w-full">
            <Volume2 className="w-4 h-4 mr-2" />
            Xem video hướng dẫn
          </Button>
        </div>

        {/* Practice Section */}
        {!hasCompleted ? (
          <div className="bg-card neo-border neo-shadow rounded-sm p-6">
            <h2 className="text-xl font-black text-foreground mb-4">
              🎤 Thực hành với AI
            </h2>
            <p className="font-medium text-muted-foreground mb-6">
              Nhấn nút bên dưới và bắt đầu nói. AI sẽ lắng nghe và đánh giá!
            </p>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center neo-border neo-shadow-lg transition-all ${
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-primary text-primary-foreground hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_hsl(var(--foreground))]"
                }`}
              >
                <Mic className="w-10 h-10" />
              </button>
              <p className="text-sm font-bold">
                {isRecording ? "Đang ghi âm..." : "Nhấn để bắt đầu"}
              </p>
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="bg-card neo-border neo-shadow rounded-sm p-6">
            <h2 className="text-xl font-black text-foreground mb-6 text-center">
              ⭐ Kết quả của bạn
            </h2>

            {/* Overall Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${
                    i < Math.round(score.overall)
                      ? "text-primary fill-primary"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>

            {/* Scores */}
            <div className="space-y-4 mb-6">
              <div className="bg-muted neo-border rounded-sm p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold">🏃 Tốc độ nói</span>
                  <span className="font-black text-lg">{score.speed}/5</span>
                </div>
              </div>
              <div className="bg-muted neo-border rounded-sm p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold">🗣️ Phát âm rõ</span>
                  <span className="font-black text-lg">{score.pronunciation}/5</span>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-secondary/10 neo-border rounded-sm p-4 mb-6">
              <p className="font-bold text-foreground">
                💬 Phản hồi: Tuyệt vời! Giọng của bạn rất tự nhiên và rõ ràng. Tiếp tục duy trì nhé!
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleRetry} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
              <Button variant="secondary" onClick={() => navigate("/roadmap")} className="flex-1">
                Tiếp tục
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;
