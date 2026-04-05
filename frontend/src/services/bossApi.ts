/**
 * bossApi.ts – Boss Fight REST + WebSocket service
 */
import { apiFetch, getAuthHeader, API_BASE } from "./api";
import type { AdminBossConfig } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BossSessionResponse {
  session_id: string;
  scenario_title: string;
  scenario: string;
  personality: string;
  max_turns: number;
  pass_score: number;
  greeting_text: string;
  greeting_audio_b64: string;
}

export interface BossTurnResult {
  type: "turn_result" | "processing" | "pong" | "error";
  transcript?: string;
  reply?: string;
  audio_b64?: string;
  damage_to_boss?: number;
  damage_to_user?: number;
  filler_count?: number;
  user_hp?: number;
  boss_hp?: number;
  turn?: number;
  is_final?: boolean;
  score?: number;
  feedback?: string;
  passed?: boolean;
  fluency_score?: number;
  confidence_score?: number;
  content_score?: number;
  filler_total?: number;
  message?: string; // error message
}

export interface BossSessionHistory {
  id: string;
  scenario: string;
  personality: string;
  final_score: number | null;
  passed: boolean | null;
  turn_count: number;
  is_complete: boolean;
  started_at: string;
  finished_at: string | null;
}

// ─── REST APIs ────────────────────────────────────────────────────────────────

export const bossApi = {
  /** List all admin-configured boss scenarios (public) */
  listConfigs: () =>
    apiFetch<AdminBossConfig[]>("/boss/configs"),

  /** Create a new boss fight session — returns session_id + greeting audio */
  createSession: (body: {
    chapter_id: string;
    max_turns?: number;
    pass_score?: number;
  }) =>
    apiFetch<BossSessionResponse>("/boss/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Get current user's past boss sessions */
  getMyHistory: () =>
    apiFetch<BossSessionHistory[]>("/boss/sessions/me"),
};

// ─── WebSocket ────────────────────────────────────────────────────────────────

/**
 * Open a WebSocket to the boss fight real-time pipeline.
 * Handles auth token injection via query param.
 */
export async function openBossWebSocket(
  sessionId: string,
  onMessage: (result: BossTurnResult) => void,
  onError?: (err: Event) => void,
  onClose?: () => void,
): Promise<WebSocket> {
  const { data } = await import("@/integrations/supabase/client").then(
    (m) => m.supabase.auth.getSession(),
  );
  const token = data.session?.access_token ?? "";

  // Derive WS base from API_BASE (http->ws, https->wss)
  const wsBase = API_BASE.replace(/^http/, "ws");
  const url = `${wsBase}/boss/ws/${sessionId}?token=${token}`;

  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";

  ws.onmessage = (event) => {
    try {
      const data: BossTurnResult = JSON.parse(event.data as string);
      onMessage(data);
    } catch {
      // Ignore non-JSON messages
    }
  };

  ws.onerror = (e) => {
    onError?.(e);
  };

  ws.onclose = () => {
    onClose?.();
  };

  // Wait for open
  await new Promise<void>((resolve, reject) => {
    const originalOnOpen = ws.onopen;
    ws.onopen = (e) => {
      resolve();
      if (typeof originalOnOpen === "function") originalOnOpen.call(ws, e);
    };
    ws.onerror = (e) => {
      reject(e);
      onError?.(e);
    };
  });

  return ws;
}

/** Send raw audio blob to boss WebSocket */
export function sendAudioToWs(ws: WebSocket, blob: Blob): void {
  blob.arrayBuffer().then((buf) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(buf);
  });
}

/** Send a finish/ping control message */
export function sendWsControl(
  ws: WebSocket,
  type: "finish" | "ping",
): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type }));
  }
}
