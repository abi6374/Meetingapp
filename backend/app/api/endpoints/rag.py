"""
MeetingMind RAG Router  (backend/app/api/endpoints/rag.py)
==========================================================
Three endpoints:
    POST /api/rag/chat           — grounded Q&A over meetings
    GET  /api/rag/search         — semantic search across transcripts
    GET  /api/rag/related/{id}   — find similar past meetings
"""

from __future__ import annotations

import logging
import httpx
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.services.rag import (
    build_rag_context,
    semantic_search,
    find_related_meetings,
)
from app.core.prompts import RAG_QA_SYSTEM_PROMPT
from app.api.dependencies import get_current_user
from app.models.domain import User

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# LLM provider helpers
# ---------------------------------------------------------------------------

GROQ_MODEL   = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-1.5-flash"


async def _call_groq(system: str, user: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system",  "content": system},
            {"role": "user",    "content": user},
        ],
        "temperature": 0.2,
        "max_tokens":  1024,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post("https://api.groq.com/openai/v1/chat/completions",
                              headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()


async def _call_gemini(system: str, user: str) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def call_llm(system: str, user: str) -> str:
    provider = settings.LLM_PROVIDER.lower()
    try:
        if provider == "gemini" and settings.GEMINI_API_KEY:
            return await _call_gemini(system, user)
        if settings.GROQ_API_KEY:
            return await _call_groq(system, user)
        raise HTTPException(status_code=503, detail="No LLM API key configured.")
    except httpx.HTTPStatusError as exc:
        logger.error("LLM API error: %s", exc.response.text)
        raise HTTPException(status_code=502, detail="LLM call failed.")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    question:   str
    meeting_id: Optional[str] = None   # scope to a specific meeting
    date_from:  Optional[str] = None   # "YYYY-MM-DD"
    date_to:    Optional[str] = None


class ChatResponse(BaseModel):
    answer:   str
    sources:  list[dict]
    provider: str


class SearchResult(BaseModel):
    meeting_id: str
    title:      str
    date:       str
    speaker:    str
    excerpt:    str
    start:      float
    end:        float
    score:      float


class RelatedMeeting(BaseModel):
    meeting_id:       str
    title:            str
    date:             str
    similarity_score: float


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse, summary="Grounded Q&A over meetings")
async def rag_chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    """
    Answer a question grounded in the user's indexed meeting transcripts.
    Optionally scoped to a single meeting or date range.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty.")

    context, source_chunks = build_rag_context(
        query=req.question,
        user_id=current_user.id,
        meeting_id=req.meeting_id,
        date_from=req.date_from,
        date_to=req.date_to,
    )

    if not context:
        return ChatResponse(
            answer=(
                "No relevant meeting content was found for your question. "
                "Make sure your meetings have finished processing and are indexed."
            ),
            sources=[],
            provider="none",
        )

    system = RAG_QA_SYSTEM_PROMPT.format(context=context)
    answer = await call_llm(system=system, user=req.question)

    sources = [
        {
            "meeting_id": c["meeting_id"],
            "title":      c["title"],
            "date":       c["date"],
            "speaker":    c["speaker"],
            "start":      c["start"],
            "end":        c["end"],
        }
        for c in source_chunks
    ]

    return ChatResponse(
        answer=answer,
        sources=sources,
        provider=settings.LLM_PROVIDER,
    )


@router.get("/search", response_model=list[SearchResult], summary="Semantic transcript search")
async def rag_search(
    q:         str          = Query(..., min_length=2, description="Search query"),
    n:         int          = Query(default=8, ge=1, le=25),
    date_from: Optional[str]= Query(default=None),
    date_to:   Optional[str]= Query(default=None),
    current_user: User = Depends(get_current_user)
):
    """
    Full-corpus semantic search across all of a user's indexed meeting transcripts.
    Returns ranked chunks with meeting metadata and timestamps.
    """
    hits = semantic_search(
        query=q,
        user_id=current_user.id,
        n_results=n,
        date_from=date_from,
        date_to=date_to,
    )
    return [
        SearchResult(
            meeting_id=h["meeting_id"] or "",
            title=     h["title"],
            date=      h["date"],
            speaker=   h["speaker"],
            excerpt=   h["text"][:300] + ("…" if len(h["text"]) > 300 else ""),
            start=     h["start"],
            end=       h["end"],
            score=     round(1 - h["distance"], 4),
        )
        for h in hits
    ]


@router.get("/related/{meeting_id}", response_model=list[RelatedMeeting],
            summary="Find related meetings")
async def related_meetings(
    meeting_id: str,
    n:          int = Query(default=5, ge=1, le=10),
    current_user: User = Depends(get_current_user)
):
    """
    Return meetings whose MOM summaries are most similar to the given meeting.
    Useful for surfacing recurring topics and connecting discussions across time.
    """
    results = find_related_meetings(
        meeting_id=meeting_id,
        user_id=current_user.id,
        n=n,
    )
    if results is None:
        raise HTTPException(status_code=404, detail="Meeting not found in index.")

    return [RelatedMeeting(**r) for r in results]
