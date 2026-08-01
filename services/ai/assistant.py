from typing import Dict, Any, Optional
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

def get_productivity_coaching(user: models.User, db: Session, query: Optional[str] = None) -> str:
    """
    Provides context-aware productivity coaching based on real user tasks.
    """
    user_ctx = context.build_user_context(user, db)
    formatted_ctx = context.format_context_for_prompt(user_ctx)
    user_query = query if query else "What should I work on today?"

    if not provider.OPENROUTER_API_KEY:
        pending = user_ctx["pending_tasks"]
        if not pending:
            return f"**AI Coach:** You have no pending tasks today, {user.name}! Enjoy your clean workspace or add a new goal."
        top_task = pending[0]
        return f"**AI Coach Suggestion for {user.name}:**\n\n🎯 **Top Priority:** Task #{top_task['id']} - **{top_task['title']}** ({top_task['priority']} priority).\n\nFocus on finishing this high-value task first today before tackling remaining items."

    messages = [
        {"role": "system", "content": f"{prompts.COACH_SYSTEM_PROMPT}\n\n=== USER TASK CONTEXT ===\n{formatted_ctx}"},
        {"role": "user", "content": user_query}
    ]
    res = provider.generate(messages)
    return res.get("content", "Could not generate coaching advice at this time.")
