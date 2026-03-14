import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Zap, User, ChevronDown, ChevronUp, BookOpen, ArrowLeft } from "lucide-react";
import RichText from "@/components/RichText";
import { lessonService } from "@/services/lessonService";
import { useUser } from "@/contexts/UserContext";
import type { LessonAttemptHistoryItem } from "@/types";

/* ─── helpers ─────────────────────────────────────────────── */

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-muted neo-border rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-black w-10 text-right">{score}</span>
    </div>
  );
}

function StarRow({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

/* ─── attempt card ─────────────────────────────────────────── */

function AttemptCard({ item }: { item: LessonAttemptHistoryItem }) {
  const [open, setOpen] = useState(false);
  const hasFeedback = item.content_feedback || item.speed_feedback || item.emotion_feedback || item.advice_text;

  const cs = Math.round((item.content_score ?? 0) * 10);
  const ss = Math.round((item.speed_score ?? 0) * 10);
  const es = Math.round((item.emotion_score ?? 0) * 10);

  return (
    <div className="neo-border neo-shadow rounded-sm bg-card overflow-hidden">
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Attempt badge */}
        <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-black text-xs neo-border flex-shrink-0">
          #{item.attempt_number}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-foreground truncate">{item.lesson_title}</p>
          <p className="text-xs text-muted-foreground truncate">{item.chapter_title}</p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StarRow stars={item.stars} />
          <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
        </div>

        <div className="flex-shrink-0 ml-1">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Score bar + mini scores */}
      <div className="px-4 pb-3 space-y-2">
        <ScoreBar score={item.score} />
        {(cs > 0 || ss > 0 || es > 0) && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Nội dung", value: cs },
              { label: "Trôi chảy", value: ss },
              { label: "Cảm xúc", value: es },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-muted-foreground font-bold">{label}</p>
                <p className="font-black text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded: transcript + feedback */}
      {open && (
        <div className="border-t neo-border-t px-4 py-4 space-y-4 bg-muted/20">
          {/* What user said */}
          {(item.audio_url || item.transcript) && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                🎙️ Bạn đã nói
              </p>
              {item.audio_url && (
                <audio
                  controls
                  src={item.audio_url}
                  className="w-full h-10 rounded"
                  style={{ accentColor: "var(--primary)" }}
                  onError={(e) => { (e.currentTarget as HTMLAudioElement).style.display = "none"; }}
                />
              )}
              {item.transcript && (
                <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-primary pl-3">
                  "{item.transcript}"
                </p>
              )}
            </div>
          )}

          {/* Feedback texts */}
          {hasFeedback ? (
            [
              { label: "📝 Nội dung", value: item.content_feedback },
              { label: "⚡ Trôi chảy", value: item.speed_feedback },
              { label: "💬 Cảm xúc", value: item.emotion_feedback },
              { label: "🎯 Gợi ý", value: item.advice_text },
            ]
              .filter((f) => !!f.value)
              .map((f) => (
                <div key={f.label}>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">{f.label}</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    <RichText text={f.value!} />
                  </p>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground italic">Chưa có nhận xét chi tiết cho lần luyện này.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────── */

const FeedbackHistory = () => {
  const navigate = useNavigate();
  const { profile, hearts } = useUser();

  const [items, setItems] = useState<LessonAttemptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lessonService
      .getMyHistory()
      .then(setItems)
      .catch(() => setError("Không thể tải lịch sử. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, []);

  /* group by lesson_id for stats */
  const lessonSet = new Set(items.map((i) => i.lesson_id));
  const avgScore = items.length ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length) : 0;
  const bestStars = items.length ? Math.max(...items.map((i) => i.stars)) : 0;

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-yellow-400 neo-border neo-shadow-sm px-3 py-1">
            <Zap className="w-4 h-4 fill-black text-black" />
            <span className="font-black text-sm text-black">{hearts}/20</span>
          </div>
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

      <div className="container mx-auto px-4 pt-8 max-w-3xl">
        {/* Back + title */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 neo-border neo-shadow-sm bg-card flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">Lịch sử luyện tập</h1>
            <p className="text-sm text-muted-foreground font-bold">Xem lại tất cả các lần bạn đã luyện tập</p>
          </div>
        </div>

        {/* Stats row */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Tổng lần luyện", value: items.length },
              { label: "Bài đã thử", value: lessonSet.size },
              { label: "Điểm TB", value: `${avgScore}/100` },
            ].map((s) => (
              <div key={s.label} className="neo-border neo-shadow rounded-sm bg-card p-4 text-center">
                <p className="text-2xl font-black text-foreground">{s.value}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Best stars callout */}
        {!loading && !error && items.length > 0 && (
          <div className="neo-border neo-shadow rounded-sm bg-primary/10 px-5 py-3 flex items-center gap-3 mb-6">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-black text-sm text-foreground">Kết quả tốt nhất</p>
              <StarRow stars={bestStars} />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="neo-border rounded-sm bg-muted/30 animate-pulse h-20" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="neo-border neo-shadow rounded-sm bg-destructive/10 p-6 text-center">
            <p className="font-bold text-destructive">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && items.length === 0 && (
          <div className="neo-border neo-shadow rounded-sm bg-card p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-muted neo-border rounded-sm flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-black text-lg text-foreground">Chưa có lần luyện nào</p>
              <p className="text-sm text-muted-foreground mt-1">Hãy vào Bản đồ và bắt đầu luyện tập!</p>
            </div>
            <button
              onClick={() => navigate("/roadmap")}
              className="mt-2 px-6 py-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs neo-border neo-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              Vào Bản đồ →
            </button>
          </div>
        )}

        {/* List */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <AttemptCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackHistory;
