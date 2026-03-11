// ─── Learning Path ───────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number;
  order_index: number;
  is_completed: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
  progress_percent: number;
}

export interface Boss {
  id: string;
  name: string;
  avatar_url: string | null;
  max_turns: number;
  is_unlocked: boolean;
}

export interface Level {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  boss_unlock_threshold: number;
  chapters: Chapter[];
  boss: Boss | null;
}

// ─── Conversation (Boss Fight) ───────────────────────────────────────────────

export interface StartConversationResponse {
  conversation_id: string;
  boss_name: string;
  greeting_text: string;
  greeting_audio_url: string;
}

export interface SpeakResponse {
  turn_index: number;
  user_transcript: string;
  filler_word_count: number;
  ai_reply_text: string;
  ai_audio_url: string;
  is_last_turn: boolean;
}

export interface TurnFeedback {
  turn_index: number;
  advice: string;
}

export interface FeedbackResponse {
  conversation_id: string;
  fluency_score: number;
  confidence_score: number;
  content_score: number;
  total_filler_words: number;
  summary_text: string;
  advice_per_turn: TurnFeedback[];
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  hearts: number;
  is_premium: boolean;
  created_at: string;
}

// ─── Mistakes ────────────────────────────────────────────────────────────────

export interface UserMistake {
  word_or_phrase: string;
  occurrence_count: number;
  last_seen_at: string;
}
