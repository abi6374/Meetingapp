import logging
import requests
from app.core.config import settings

logger = logging.getLogger(__name__)

def ask_ai(question: str, transcript: str, history: list, provider: str, model: str, system_prompt: str = None) -> str:
    if system_prompt is None:
        system_prompt = f"You are MeetingMind, an expert meeting analyst AI. Answer based ONLY on the transcript:\n\n{transcript[:12000]}"
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history[-10:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": question})

    try:
        if provider == "ollama":
            r = requests.post(f"{settings.OLLAMA_URL}/api/chat", json={"model": model, "messages": messages, "stream": False}, timeout=120)
            r.raise_for_status()
            return r.json()["message"]["content"]
            
        elif provider == "groq":
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            resp = client.chat.completions.create(model=model, messages=messages, temperature=0.3)
            return resp.choices[0].message.content
            
        elif provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            gmodel = genai.GenerativeModel(model_name=model, system_instruction=system_prompt)
            # Build Gemini-style history
            gem_history = []
            for t in history[-10:]:
                role = "user" if t["role"] == "user" else "model"
                gem_history.append({"role": role, "parts": [t["content"]]})
            chat = gmodel.start_chat(history=gem_history)
            return chat.send_message(question).text
            
    except Exception as e:
        logger.error(f"AI Provider error ({provider}): {str(e)}")
        return f"AI Error: {e}"
        
    return "No AI provider configured."
