from typing import Optional

from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.announcements.service import get_workspace


@tool
def get_campus_announcements(category: Optional[str] = None, tag: Optional[str] = None) -> str:
    """Get campus announcements and inbox items, optionally filtered by category or tag.
    Use this for course announcements, hackathons, volunteering, events, placement opportunities,
    resources, assignment notices, quiz notices, and result releases.
    """
    try:
        return get_workspace(DEFAULT_CAMPUS_ID, category=category, tag=tag).json()
    except Exception as error:
        return f"Error fetching announcements: {error}"


ANNOUNCEMENT_TOOLS = [get_campus_announcements]
