from typing import Optional

from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.announcements.service import get_workspace


@tool
def get_campus_announcements(user_id: str = "") -> str:
    """Get all recent campus announcements and inbox items.
    Data Returned (JSON): announcements (array of title, body, category, tag, priority, course_name).
    Use Cases: Use this when the user asks "what's happening on campus?", "are there any hackathons?", or asks for specific types of announcements like placements. Filter the returned list yourself based on the user's request.
    """
    try:
        return get_workspace(DEFAULT_CAMPUS_ID).json()
    except Exception as error:
        return f"Error fetching announcements: {error}"


ANNOUNCEMENT_TOOLS = [get_campus_announcements]
