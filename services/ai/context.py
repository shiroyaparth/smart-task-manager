from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from app import models

def build_user_context(user: models.User, db: Session) -> Dict[str, Any]:
    """
    Assembles a token-efficient, server-side context object representing the 
    authenticated user's active tasks, metrics, and current date.
    """
    tasks = db.query(models.Task).all()

    pending_tasks = []
    completed_tasks = []
    high_priority_count = 0

    for t in tasks:
        item = {
            "id": t.id,
            "title": t.title,
            "priority": t.priority,
            "description": t.description or "",
            "status": t.status,
            "created_at": t.created_at.strftime("%Y-%m-%d") if t.created_at else ""
        }
        if t.priority == "high" and t.status != "completed":
            high_priority_count += 1

        if t.status == "completed":
            completed_tasks.append(item)
        else:
            pending_tasks.append(item)

    return {
        "today_date": datetime.utcnow().strftime("%A, %b %d, %Y"),
        "user_info": {
            "name": user.name,
            "email": user.email
        },
        "stats": {
            "total_tasks": len(tasks),
            "pending_count": len(pending_tasks),
            "completed_count": len(completed_tasks),
            "high_priority_pending": high_priority_count
        },
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks
    }

def format_context_for_prompt(ctx: Dict[str, Any]) -> str:
    """
    Formats the context dictionary into a token-optimized string for LLM system prompts.
    """
    lines = [
        f"Date: {ctx['today_date']}",
        f"User: {ctx['user_info']['name']} ({ctx['user_info']['email']})",
        f"Stats: {ctx['stats']['pending_count']} pending, {ctx['stats']['completed_count']} completed, {ctx['stats']['high_priority_pending']} high-priority pending.",
        "\nPending Tasks:"
    ]

    if not ctx['pending_tasks']:
        lines.append(" - No pending tasks.")
    else:
        for t in ctx['pending_tasks']:
            desc = f" ({t['description']})" if t['description'] else ""
            lines.append(f" - [ID {t['id']}] [{t['priority'].upper()}] {t['title']}{desc}")

    lines.append("\nRecently Completed Tasks:")
    if not ctx['completed_tasks']:
        lines.append(" - No completed tasks.")
    else:
        for t in ctx['completed_tasks'][:5]:
            lines.append(f" - [ID {t['id']}] {t['title']}")

    return "\n".join(lines)
