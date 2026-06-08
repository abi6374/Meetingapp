import re
import logging
from app.services.ai_service import ask_ai

logger = logging.getLogger(__name__)

MOM_PROMPT = """# Meeting Intelligence Report
**Meeting Title:** {title} | **Date:** {date} | **Duration:** {duration}
**Attendees:** {speakers}

Generate an enterprise-grade Minutes of Meeting (MOM) report based ONLY on the provided transcript.
Format strictly using the exact headers below.

## 1. Meeting Information
[Brief context about the meeting setup and participants]

## 2. Executive Summary
[Provide a concise 2-3 sentence high-level overview of the meeting's primary purpose and outcome]

## 3. Discussion Points
[Detailed bullet points of the main topics discussed, grouped logically by theme]

## 4. Key Decisions
[Numbered list of all final, binding decisions agreed upon during the meeting]

## 5. Action Items
| # | Action | Owner | Deadline |
|---|--------|-------|----------|
[Extract every task. Assign to the speaker who agreed to it, or "Unassigned". Estimate deadlines if mentioned.]

## 6. Risks
[Bullet points of any potential risks, liabilities, or concerns raised by participants]

## 7. Blockers
[Bullet points of any current obstacles or dependencies preventing progress]

## 8. Follow-Up Tasks
[List of any items that require further discussion or investigation outside this meeting]

## 9. Next Meeting Recommendations
[Suggested date, time, or agenda for the next sync if mentioned, otherwise "TBD"]

## 10. AI Insights
[A brief analysis of the meeting sentiment, speaker engagement, or underlying themes]

TRANSCRIPT REFERENCE:
{transcript}"""

def extract_action_items_regex(transcript: str) -> list[str]:
    """Fallback/Heuristic extraction of action items from transcript text."""
    sents = re.split(r"(?<=[\.!?])\s+", transcript)
    action_keywords = ["action", "will", "assign", "todo", "due", "deadline", "deliver", "implement", "follow up", "owner"]
    actions = [s.strip() for s in sents if any(kw in s.lower() for kw in action_keywords) and len(s.strip()) > 10]
    return list(dict.fromkeys(actions))

def generate_mom(title: str, date: str, duration: str, speakers: str, transcript: str, provider: str, model: str) -> str:
    """Generate structured Meeting Minutes via AI."""
    logger.info("Generating Meeting Intelligence Report...")
    
    # Parse duration to seconds
    duration_seconds = 0
    if duration and duration != "TBD":
        try:
            parts = duration.split(":")
            if len(parts) == 3:
                duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:
                duration_seconds = int(parts[0]) * 60 + int(parts[1])
            else:
                duration_seconds = int(float(duration))
        except Exception:
            pass

    from app.core.prompts import MOM_SYSTEM_PROMPT, build_mom_user_prompt
    user_prompt = build_mom_user_prompt(transcript, duration_seconds=duration_seconds)
    
    return ask_ai(
        question=user_prompt,
        transcript=transcript,
        history=[],
        provider=provider,
        model=model,
        system_prompt=MOM_SYSTEM_PROMPT
    )
