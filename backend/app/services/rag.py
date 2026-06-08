"""
MeetingMind RAG Service
=======================
Handles:
  - Indexing: chunking transcripts + MOM into ChromaDB after pipeline completion
  - Chat Q&A: answer questions grounded in all indexed meetings
  - Semantic search: surface transcript passages matching a query
  - Related meetings: find meetings similar to a given meeting

Collections:
    meeting_chunks     — speaker-segmented transcript chunks (primary retrieval)
    meeting_summaries  — MOM summaries (for related-meeting matching)
"""

from __future__ import annotations

import os
import re
import textwrap
import logging
from datetime import datetime
from typing import Optional

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

from app.core.config import settings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CHROMA_PATH = settings.CHROMA_PATH
EMBED_MODEL  = settings.EMBED_MODEL

# Chunking
CHUNK_WORDS      = 120   # target words per chunk (roughly 500-600 chars)
CHUNK_OVERLAP    = 20    # word overlap between consecutive chunks
MAX_CHUNKS_FETCH = 6     # top-k chunks returned for Q&A
MAX_CHUNKS_SEARCH= 10    # top-k for semantic search results
RELATED_COUNT    = 5     # number of related meetings to return

# ---------------------------------------------------------------------------
# Singleton helpers
# ---------------------------------------------------------------------------

_chroma_client: Optional[chromadb.PersistentClient] = None
_embed_model:   Optional[SentenceTransformer]       = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client initialised at %s", CHROMA_PATH)
    return _chroma_client


def get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        logger.info("Loading embedding model: %s", EMBED_MODEL)
        _embed_model = SentenceTransformer(EMBED_MODEL)
    return _embed_model


def _get_collections() -> tuple[chromadb.Collection, chromadb.Collection]:
    client = get_chroma_client()
    chunks_col = client.get_or_create_collection(
        name="meeting_chunks",
        metadata={"hnsw:space": "cosine"},
    )
    summaries_col = client.get_or_create_collection(
        name="meeting_summaries",
        metadata={"hnsw:space": "cosine"},
    )
    return chunks_col, summaries_col


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _chunk_transcript(transcript: str, speaker_turns: list[dict]) -> list[dict]:
    """
    Split transcript into chunks respecting speaker boundaries where possible.

    speaker_turns: list of {"speaker": str, "text": str, "start": float, "end": float}

    Returns list of {"text": str, "speaker": str, "start": float, "end": float}
    """
    if not speaker_turns:
        # Fallback: plain word-window chunking
        words = transcript.split()
        chunks = []
        for i in range(0, len(words), CHUNK_WORDS - CHUNK_OVERLAP):
            chunk_words = words[i : i + CHUNK_WORDS]
            chunks.append({
                "text":    " ".join(chunk_words),
                "speaker": "unknown",
                "start":   0.0,
                "end":     0.0,
            })
        return chunks

    chunks: list[dict] = []
    buffer_words: list[str] = []
    buffer_speaker = speaker_turns[0]["speaker"]
    buffer_start   = speaker_turns[0].get("start", 0.0)
    buffer_end     = 0.0

    def flush(spk: str, start: float, end: float) -> None:
        if not buffer_words:
            return
        # Slide a word window over the buffer (handles long monologues)
        for j in range(0, len(buffer_words), CHUNK_WORDS - CHUNK_OVERLAP):
            slice_w = buffer_words[j : j + CHUNK_WORDS]
            chunks.append({
                "text":    " ".join(slice_w),
                "speaker": spk,
                "start":   start,
                "end":     end,
            })

    for turn in speaker_turns:
        spk   = turn.get("speaker", "unknown")
        words = turn.get("text", "").split()
        t_s   = turn.get("start", 0.0)
        t_e   = turn.get("end",   0.0)

        if spk != buffer_speaker and len(buffer_words) >= CHUNK_WORDS // 2:
            flush(buffer_speaker, buffer_start, buffer_end)
            buffer_words   = []
            buffer_speaker = spk
            buffer_start   = t_s

        buffer_words.extend(words)
        buffer_end = t_e

        if len(buffer_words) >= CHUNK_WORDS:
            flush(buffer_speaker, buffer_start, buffer_end)
            # keep overlap
            buffer_words   = buffer_words[-CHUNK_OVERLAP:]
            buffer_start   = buffer_end

    flush(buffer_speaker, buffer_start, buffer_end)
    return chunks


# ---------------------------------------------------------------------------
# Indexing
# ---------------------------------------------------------------------------

def index_meeting(
    meeting_id:    str,
    user_id:       str,
    title:         str,
    transcript:    str,
    speaker_turns: list[dict],
    mom_summary:   str,
    date_iso:      Optional[str] = None,
) -> int:
    """
    Index a completed meeting into ChromaDB.
    Called from pipeline.py (or main.py) after processing finishes.

    Returns number of chunks indexed.
    """
    chunks_col, summaries_col = _get_collections()
    model = get_embed_model()
    date_iso = date_iso or datetime.utcnow().date().isoformat()

    # --- Delete stale data for this meeting (re-index idempotent) ---
    try:
        existing = chunks_col.get(where={"meeting_id": meeting_id})
        if existing["ids"]:
            chunks_col.delete(ids=existing["ids"])
    except Exception:
        pass

    try:
        summaries_col.delete(ids=[meeting_id])
    except Exception:
        pass

    # --- Index transcript chunks ---
    chunks = _chunk_transcript(transcript, speaker_turns)
    if not chunks:
        logger.warning("No chunks generated for meeting %s", meeting_id)
        return 0

    texts      = [c["text"]    for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=False, batch_size=32).tolist()
    ids        = [f"{meeting_id}__chunk_{i}" for i in range(len(chunks))]
    metadatas  = [
        {
            "meeting_id": meeting_id,
            "user_id":    user_id,
            "title":      title,
            "speaker":    c["speaker"],
            "start":      float(c["start"]),
            "end":        float(c["end"]),
            "date":       date_iso,
            "type":       "chunk",
        }
        for c in chunks
    ]

    chunks_col.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    # --- Index MOM summary as a single vector (for related-meeting matching) ---
    if mom_summary.strip():
        summary_embed = model.encode([mom_summary], show_progress_bar=False).tolist()
        summaries_col.add(
            ids=[meeting_id],
            embeddings=summary_embed,
            documents=[mom_summary],
            metadatas=[{
                "meeting_id": meeting_id,
                "user_id":    user_id,
                "title":      title,
                "date":       date_iso,
                "type":       "summary",
            }],
        )

    logger.info("Indexed meeting %s: %d chunks", meeting_id, len(chunks))
    return len(chunks)


def delete_meeting_index(meeting_id: str) -> None:
    """Remove all vectors for a meeting (call when a meeting is deleted)."""
    chunks_col, summaries_col = _get_collections()
    try:
        existing = chunks_col.get(where={"meeting_id": meeting_id})
        if existing["ids"]:
            chunks_col.delete(ids=existing["ids"])
    except Exception:
        pass
    try:
        summaries_col.delete(ids=[meeting_id])
    except Exception:
        pass
    logger.info("Deleted index for meeting %s", meeting_id)


# ---------------------------------------------------------------------------
# Retrieval helpers
# ---------------------------------------------------------------------------

def _retrieve_chunks(
    query: str,
    user_id: str,
    meeting_id: Optional[str] = None,
    n_results: int = MAX_CHUNKS_FETCH,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
) -> list[dict]:
    """
    Embed query and do cosine similarity search in meeting_chunks.
    Returns list of {"text", "meeting_id", "title", "speaker", "start", "end", "date", "distance"}.
    """
    chunks_col, _ = _get_collections()
    model = get_embed_model()

    query_embed = model.encode([query], show_progress_bar=False).tolist()

    where: dict = {"user_id": user_id}
    if meeting_id:
        where["meeting_id"] = meeting_id

    # ChromaDB where clause supports $and for multiple conditions
    if date_from and date_to:
        where = {"$and": [
            {"user_id": user_id},
            {"date": {"$gte": date_from}},
            {"date": {"$lte": date_to}},
        ]}
        if meeting_id:
            where["$and"].append({"meeting_id": meeting_id})

    try:
        results = chunks_col.query(
            query_embeddings=query_embed,
            n_results=min(n_results, 20),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        logger.error("ChromaDB query failed: %s", exc)
        return []

    output = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        output.append({
            "text":       doc,
            "meeting_id": meta.get("meeting_id"),
            "title":      meta.get("title", "Untitled"),
            "speaker":    meta.get("speaker", "unknown"),
            "start":      meta.get("start", 0.0),
            "end":        meta.get("end",   0.0),
            "date":       meta.get("date",  ""),
            "distance":   dist,
        })
    return output


# ---------------------------------------------------------------------------
# Use-case 1: Chat Q&A
# ---------------------------------------------------------------------------

def build_rag_context(
    query: str,
    user_id: str,
    meeting_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
) -> tuple[str, list[dict]]:
    """
    Retrieve top-k chunks and format them into an LLM-ready context block.

    Returns:
        (context_string, source_chunks_list)

    The context_string is injected into the system prompt before the user query.
    """
    chunks = _retrieve_chunks(
        query=query,
        user_id=user_id,
        meeting_id=meeting_id,
        n_results=MAX_CHUNKS_FETCH,
        date_from=date_from,
        date_to=date_to,
    )

    if not chunks:
        return "", []

    lines = []
    for i, c in enumerate(chunks, 1):
        ts = f"{c['start']:.0f}s–{c['end']:.0f}s" if c["start"] or c["end"] else ""
        header = f"[{i}] {c['title']} | {c['date']}"
        if c["speaker"] != "unknown":
            header += f" | Speaker: {c['speaker']}"
        if ts:
            header += f" | {ts}"
        lines.append(header)
        lines.append(c["text"])
        lines.append("")

    context = "\n".join(lines).strip()
    return context, chunks


# ---------------------------------------------------------------------------
# Use-case 2: Semantic search
# ---------------------------------------------------------------------------

def semantic_search(
    query: str,
    user_id: str,
    n_results: int = MAX_CHUNKS_SEARCH,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
) -> list[dict]:
    """
    Full-corpus semantic search across all of a user's meetings.
    Returns ranked list of chunk hits with metadata.
    """
    return _retrieve_chunks(
        query=query,
        user_id=user_id,
        n_results=n_results,
        date_from=date_from,
        date_to=date_to,
    )


# ---------------------------------------------------------------------------
# Use-case 3: Related meetings
# ---------------------------------------------------------------------------

def find_related_meetings(
    meeting_id: str,
    user_id:    str,
    n: int = RELATED_COUNT,
) -> list[dict]:
    """
    Find meetings with the most similar MOM summary to meeting_id.
    Returns list of {"meeting_id", "title", "date", "similarity_score"}.
    """
    _, summaries_col = _get_collections()

    # Fetch the source meeting's summary vector
    try:
        result = summaries_col.get(ids=[meeting_id], include=["embeddings", "metadatas"])
    except Exception as exc:
        logger.error("Could not fetch summary for %s: %s", meeting_id, exc)
        return []

    if not result["ids"]:
        logger.warning("No summary indexed for meeting %s", meeting_id)
        return []

    source_embed = result["embeddings"][0]

    # Query for similar summaries, excluding the source meeting itself
    try:
        similar = summaries_col.query(
            query_embeddings=[source_embed],
            n_results=n + 1,
            where={"$and": [
                {"user_id":    user_id},
                {"meeting_id": {"$ne": meeting_id}},
            ]},
            include=["metadatas", "distances"],
        )
    except Exception as exc:
        logger.error("Related meetings query failed: %s", exc)
        return []

    output = []
    for meta, dist in zip(
        similar["metadatas"][0][:n],
        similar["distances"][0][:n],
    ):
        output.append({
            "meeting_id":       meta.get("meeting_id"),
            "title":            meta.get("title", "Untitled"),
            "date":             meta.get("date",  ""),
            "similarity_score": round(1 - dist, 4),   # cosine: 1 = identical
        })

    return sorted(output, key=lambda x: x["similarity_score"], reverse=True)
