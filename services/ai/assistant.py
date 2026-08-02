from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app import models
from services.ai import provider, context, prompts, parser

# In-memory daily summary cache per (user_id, date_str)
DAILY_SUMMARY_CACHE: Dict[str, str] = {}

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

def breakdown_task(task_title: str, user: models.User, db: Session) -> Dict[str, Any]:
    """
    Decomposes a task title into structured subtasks using JSON mode.
    """
    if not provider.OPENROUTER_API_KEY:
        return {
            "task_title": task_title,
            "subtasks": [
                {"title": f"Plan and scope: {task_title}", "priority": "high", "description": "Define initial requirements and deliverables."},
                {"title": f"Implementation step 1 for {task_title}", "priority": "medium", "description": "Execute core logic and architecture."},
                {"title": f"Review and verify {task_title}", "priority": "low", "description": "Run verification checks and complete task."}
            ]
        }

    user_ctx = context.build_user_context(user, db)
    formatted_ctx = context.format_context_for_prompt(user_ctx)

    messages = [
        {"role": "system", "content": f"{prompts.BREAKDOWN_SYSTEM_PROMPT}\n\n=== USER CONTEXT ===\n{formatted_ctx}"},
        {"role": "user", "content": f"Decompose this task into subtasks: {task_title}"}
    ]

    res = provider.generate(messages, json_mode=True)
    content = res.get("content", "{}")
    try:
        parsed = parser.parse_json_response(content)
        if "subtasks" in parsed:
            return parsed
    except Exception:
        pass

    return {
        "task_title": task_title,
        "subtasks": [
            {"title": f"Analyze requirements for {task_title}", "priority": "medium", "description": "Break down goal into steps."},
            {"title": f"Execute core work for {task_title}", "priority": "high", "description": "Build primary deliverable."},
            {"title": f"Final review of {task_title}", "priority": "low", "description": "Ensure quality completion."}
        ]
    }

def parse_natural_language_task(nl_input: str, user: models.User, db: Session) -> Dict[str, Any]:
    """
    Parses freeform text like "Tomorrow 6 PM Gym" or "Urgent bugfix" into structured task fields.
    """
    if not provider.OPENROUTER_API_KEY:
        lower = nl_input.lower()
        priority = "high" if any(w in lower for w in ["urgent", "high", "asap", "important"]) else ("low" if "low" in lower else "medium")
        return {
            "title": nl_input.strip(),
            "priority": priority,
            "description": f"Parsed from natural language input: '{nl_input}'"
        }

    user_ctx = context.build_user_context(user, db)
    formatted_ctx = context.format_context_for_prompt(user_ctx)

    messages = [
        {"role": "system", "content": f"{prompts.PARSE_TASK_PROMPT}\n\n=== USER CONTEXT ===\n{formatted_ctx}"},
        {"role": "user", "content": f"Parse task: {nl_input}"}
    ]

    res = provider.generate(messages, json_mode=True)
    content = res.get("content", "{}")
    try:
        parsed = parser.parse_json_response(content)
        if "title" in parsed:
            return {
                "title": parsed.get("title", nl_input),
                "priority": parsed.get("priority", "medium"),
                "description": parsed.get("description", "")
            }
    except Exception:
        pass

    return {
        "title": nl_input.strip(),
        "priority": "medium",
        "description": ""
    }

def generate_daily_summary(user: models.User, db: Session, force_refresh: bool = False) -> str:
    """
    Auto-generates a structured daily summary: completed today, pending, 2-3 actionable suggestions.
    Cached per (user_id, today_date).
    """
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    cache_key = f"{user.id}_{today_str}"

    if not force_refresh and cache_key in DAILY_SUMMARY_CACHE:
        return DAILY_SUMMARY_CACHE[cache_key]

    user_ctx = context.build_user_context(user, db)
    formatted_ctx = context.format_context_for_prompt(user_ctx)

    if not provider.OPENROUTER_API_KEY:
        completed = user_ctx["stats"]["completed_count"]
        pending = user_ctx["stats"]["pending_count"]
        summary = (
            f"📅 **Daily Summary for {user.name} ({today_str})**\n\n"
            f"📊 **Overview:** {completed} task(s) completed today | {pending} task(s) pending.\n\n"
            f"💡 **3 Actionable Suggestions:**\n"
            f"1. Complete top high-priority task items.\n"
            f"2. Clear pending items in order of creation.\n"
            f"3. Plan upcoming goals for tomorrow."
        )
        DAILY_SUMMARY_CACHE[cache_key] = summary
        return summary

    messages = [
        {"role": "system", "content": f"{prompts.DAILY_SUMMARY_PROMPT}\n\n=== USER CONTEXT ===\n{formatted_ctx}"},
        {"role": "user", "content": f"Generate my daily executive summary for today ({today_str})."}
    ]

    res = provider.generate(messages)
    summary = res.get("content", "Unable to generate daily summary.")
    DAILY_SUMMARY_CACHE[cache_key] = summary
    return summary

def generate_weekly_report(user: models.User, db: Session) -> str:
    """
    Aggregates weekly task statistics and generates AI narrative insights.
    """
    user_ctx = context.build_user_context(user, db)
    formatted_ctx = context.format_context_for_prompt(user_ctx)
    stats = user_ctx["stats"]

    total = stats["total_tasks"]
    completed = stats["completed_count"]
    pending = stats["pending_count"]
    high = stats["high_priority_pending"]
    rate = round((completed / total * 100), 1) if total > 0 else 0.0

    if not provider.OPENROUTER_API_KEY:
        return (
            f"📈 **Weekly Productivity Report for {user.name}**\n\n"
            f"📊 **Aggregated Statistics:**\n"
            f"- Total Tasks Managed: **{total}**\n"
            f"- Completed Tasks: **{completed}**\n"
            f"- Pending Backlog: **{pending}** ({high} High Priority)\n"
            f"- Completion Resolution Rate: **{rate}%**\n\n"
            f"🏆 **Narrative Insights:**\n"
            f"You maintained a **{rate}%** resolution throughput this week. Focusing on clearing high-priority items will boost your momentum for next week."
        )

    messages = [
        {"role": "system", "content": f"{prompts.WEEKLY_REPORT_PROMPT}\n\n=== AGGREGATE WEEKLY STATS & TASK CONTEXT ===\nCompletion Rate: {rate}%\nTotal: {total}, Completed: {completed}, Pending: {pending}, High Priority Pending: {high}\n\n{formatted_ctx}"},
        {"role": "user", "content": "Synthesize this week's task metrics into an executive narrative productivity report."}
    ]

    res = provider.generate(messages)
    return res.get("content", "Unable to generate weekly productivity report.")

def parse_search_intent(query_text: str, user: models.User, db: Session) -> Dict[str, Any]:
    """
    Translates natural language search queries into structured task filters.
    AI's role is intent -> filter mapping, preserving existing database query execution logic.
    """
    lower = query_text.lower()
    
    if not provider.OPENROUTER_API_KEY:
        p_filter = "high" if "high" in lower else ("medium" if "medium" in lower else ("low" if "low" in lower else None))
        s_filter = "completed" if ("completed" in lower or "finished" in lower or "done" in lower) else ("pending" if ("unfinished" in lower or "pending" in lower or "todo" in lower) else None)
        cleaned_query = query_text.replace("show", "").replace("unfinished", "").replace("completed", "").replace("tasks", "").replace("high priority", "").strip()
        return {
            "priority": p_filter,
            "status": s_filter,
            "query": cleaned_query if cleaned_query else None
        }

    user_ctx = context.build_user_context(user, db)
    formatted_ctx = context.format_context_for_prompt(user_ctx)

    messages = [
        {"role": "system", "content": f"{prompts.INTENT_FILTER_PROMPT}\n\n=== USER CONTEXT ===\n{formatted_ctx}"},
        {"role": "user", "content": f"Parse search intent: {query_text}"}
    ]

    res = provider.generate(messages, json_mode=True)
    content = res.get("content", "{}")
    try:
        parsed = parser.parse_json_response(content)
        return {
            "priority": parsed.get("priority"),
            "status": parsed.get("status"),
            "query": parsed.get("query")
        }
    except Exception:
        pass

    return {"priority": None, "status": None, "query": query_text}
