from typing import Dict, Any
from sqlalchemy.orm import Session
from app import models
from services.ai import provider, context, prompts

def process_chat_message(user_message: str, user: models.User, db: Session) -> str:
    """
    Orchestrates AI chat processing: fetches context, formats prompt, calls provider.
    """
    user_ctx = context.build_user_context(user, db)
    formatted_ctx = context.format_context_for_prompt(user_ctx)

    if not provider.OPENROUTER_API_KEY:
        return f"**[AI Context System active]**\n\nHello {user.name}! Here is the server-side context generated for your request:\n\n```\n{formatted_ctx}\n```\n\n*Configure OPENROUTER_API_KEY to enable live LLM model generation.*"

    messages = [
        {"role": "system", "content": f"{prompts.SYSTEM_BASE_PROMPT}\n\n=== USER CONTEXT ===\n{formatted_ctx}"},
        {"role": "user", "content": user_message}
    ]
    res = provider.generate(messages)
    return res.get("content", "Sorry, I couldn't process your request.")
