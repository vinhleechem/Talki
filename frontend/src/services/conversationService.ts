import { apiFetch, getAuthHeader, API_BASE } from "./api";
import type { FeedbackResponse, SpeakResponse, StartConversationResponse } from "@/types";

export const conversationService = {
  /** Start a Boss Fight session (consumes 1 heart) */
  start(bossId: string): Promise<StartConversationResponse> {
    return apiFetch<StartConversationResponse>("/conversations/start", {
      method: "POST",
      body: JSON.stringify({ boss_id: bossId }),
    });
  },

  /** Send a recorded audio blob to the backend */
  async speak(conversationId: string, audioBlob: Blob): Promise<SpeakResponse> {
    const headers = await getAuthHeader();
    const form = new FormData();
    form.append("audio", audioBlob, "turn.webm");

    const res = await fetch(`${API_BASE}/conversations/${conversationId}/speak`, {
      method: "POST",
      headers,
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? "API error");
    }
    return res.json() as Promise<SpeakResponse>;
  },

  /** Fetch post-session scorecard */
  getFeedback(conversationId: string): Promise<FeedbackResponse> {
    return apiFetch<FeedbackResponse>(`/conversations/${conversationId}/feedback`);
  },
};
