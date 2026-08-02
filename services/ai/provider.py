import os
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-3.5-turbo")

def generate(
    messages: List[Dict[str, str]], 
    model: str = DEFAULT_MODEL, 
    stream: bool = False, 
    json_mode: bool = False
) -> Dict[str, Any]:
    """
    Model-agnostic wrapper for OpenRouter API.
    """
    if not OPENROUTER_API_KEY:
        # Graceful fallback when API key is missing
        return {"content": "OpenRouter API Key not configured. Please set OPENROUTER_API_KEY in environment."}

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Smart Task Manager AI",
    }
    
    payload = {
        "model": model,
        "messages": messages,
    }
    
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30
    )
    
    if response.status_code != 200:
        return {"error": f"API error: {response.status_code}", "content": response.text}

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    return {"content": content, "raw": data}
