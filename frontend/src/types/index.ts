// ─── Learning Path ───────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  video_duration: number;
  action_prompt: string | null;
  order_index: number;
  is_completed: boolean;
}

export interface Boss {
  id: string;
  name: string;
  avatar_url: string | null;
  mission_prompt: string;
  max_turns: number;
  pass_score: number;
  is_unlocked: boolean;
  is_published: boolean;
}

// V2.1: chapters IS the top-level (no separate 'levels' table)
export interface Chapter {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  order_index: number;
  boss_unlock_threshold: number;
  is_published: boolean;
  lessons: Lesson[];
  boss: Boss | null;
  progress_percent: number;
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
  role: string;
  created_at: string;
}

// ─── Mistakes ────────────────────────────────────────────────────────────────

export interface UserMistake {
  word_or_phrase: string;
  occurrence_count: number;
  last_seen_at: string;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  active_lessons: number;
  total_conversations: number;
  total_revenue_vnd: number;
}

export interface AdminUser {
  id: string;
  display_name: string;
  email: string;
  role: string;
  plan: string;
  energy: number;
  created_at: string;
}

export interface AdminChapter {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  order_index: number;
  boss_unlock_threshold: number;
  is_published: boolean;
  lesson_count: number;
}

export interface AdminLesson {
  id: string;
  chapter_id: string;
  title: string;
  video_url: string | null;
  video_duration: number;
  action_prompt: string | null;
  order_index: number;
  is_published: boolean;
}

export interface AdminBoss {
  id: string;
  chapter_id: string;
  name: string;
  mission_prompt: string;
  persona_prompt: string;
  gender: string;
  max_turns: number;
  pass_score: number;
  avatar_url: string | null;
  is_published: boolean;
}

export interface AdminPayment {
  id: string;
  user_id: string;
  plan: string;
  amount_vnd: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export interface AdminAchievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_url: string | null;
  condition_type: string;
  condition_value: number;
  created_at: string;
}

export interface AdminConversation {
  id: string;
  user_id: string;
  boss_id: string;
  boss_name: string;
  user_name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

// ─── Lesson Attempt Feedback ──────────────────────────────────────────────────

export interface LessonAttemptFeedback {
  id: string;
  lesson_id: string;
  attempt_number: number;
  content_score: number;
  speed_score: number;
  emotion_score: number;
  overall_score: number;
  feedback_text: string | null;
  created_at: string;
}

export interface LessonAttemptFeedbackCreate {
  content_score: number;
  speed_score: number;
  emotion_score: number;
  overall_score: number;
  feedback_text?: string | null;
}
