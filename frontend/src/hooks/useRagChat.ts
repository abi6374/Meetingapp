import { useState, useCallback } from "react";
import { askMeetingQuestion, ChatSource } from "@/lib/rag-api";

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export function useRagChat(userId: string, meetingId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: question }]);
      setLoading(true);

      try {
        const res = await askMeetingQuestion({ question, userId, meetingId });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.answer, sources: res.sources },
        ]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Request failed";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Sorry, I couldn't get an answer: ${msg}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [userId, meetingId, loading],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, ask, reset };
}
