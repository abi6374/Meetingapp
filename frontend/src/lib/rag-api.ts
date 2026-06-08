const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ChatSource {
  meeting_id: string;
  title: string;
  date: string;
  speaker: string;
  start: number;
  end: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  provider: string;
}

export interface SearchHit {
  meeting_id: string;
  title: string;
  date: string;
  speaker: string;
  excerpt: string;
  start: number;
  end: number;
  score: number;
}

export interface RelatedMeeting {
  meeting_id: string;
  title: string;
  date: string;
  similarity_score: number;
}

export async function askMeetingQuestion(params: {
  question: string;
  userId: string;
  meetingId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/rag/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question:   params.question,
      user_id:    params.userId,
      meeting_id: params.meetingId ?? null,
      date_from:  params.dateFrom ?? null,
      date_to:    params.dateTo ?? null,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function semanticSearch(params: {
  query: string;
  userId: string;
  n?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<SearchHit[]> {
  const url = new URL(`${API_BASE}/rag/search`);
  url.searchParams.set("q",        params.query);
  url.searchParams.set("user_id",  params.userId);
  if (params.n)        url.searchParams.set("n",         String(params.n));
  if (params.dateFrom) url.searchParams.set("date_from", params.dateFrom);
  if (params.dateTo)   url.searchParams.set("date_to",   params.dateTo);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getRelatedMeetings(
  meetingId: string,
  userId: string,
  n = 5,
): Promise<RelatedMeeting[]> {
  const url = new URL(`${API_BASE}/rag/related/${meetingId}`);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("n", String(n));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
