import json
import os

def fetch_default_json(source_url: str) -> dict:
    """
    For MVP, we assume source_url is a local file path like 'default.json'
    Or we can just use a hardcoded fallback.
    """
    if not source_url or not os.path.exists(source_url):
        # Fallback to a mock JSON if not found
        return {
            "breakfast": ["idli", "tea"],
            "lunch": ["rice", "paneer"],
            "dinner": ["dal", "roti"]
        }
    
    with open(source_url, 'r') as f:
        return json.load(f)
