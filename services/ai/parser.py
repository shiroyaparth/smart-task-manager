import json

def parse_json_response(content: str) -> dict:
    """
    Parses JSON output from AI response safely.
    """
    try:
        return json.loads(content)
    except Exception:
        # Fallback if markdown code fences wrapped the JSON
        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())
