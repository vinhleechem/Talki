import { useState } from "react";
import { conversationService } from "@/services/conversationService";
import type { FeedbackResponse, SpeakResponse, StartConversationResponse } from "@/types";

type Phase = "idle" | "starting" | "active" | "finished" | "error";

export function useConversation() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<StartConversationResponse | null>(null);
  const [turns, setTurns] = useState<SpeakResponse[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSession = async (bossId: string) => {
    setPhase("starting");
    setError(null);
    try {
      const data = await conversationService.start(bossId);
      setSession(data);
      setTurns([]);
      setFeedback(null);
      setPhase("active");
    } catch (e: unknown) {
      setError((e as Error).message);
      setPhase("error");
    }
  };

  const submitTurn = async (audioBlob: Blob) => {
    if (!session) return;
    try {
      const turn = await conversationService.speak(session.conversation_id, audioBlob);
      setTurns((prev) => [...prev, turn]);
      if (turn.is_last_turn) {
        const fb = await conversationService.getFeedback(session.conversation_id);
        setFeedback(fb);
        setPhase("finished");
      }
    } catch (e: unknown) {
      setError((e as Error).message);
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("idle");
    setSession(null);
    setTurns([]);
    setFeedback(null);
    setError(null);
  };

  return { phase, session, turns, feedback, error, startSession, submitTurn, reset };
}
