from typing import Optional
from langchain_core.tools import tool
from modules.campus_rooms.service import DEFAULT_CAMPUS_ID, get_workspace

@tool
def get_room_bookings_and_courses(campus_id: str = DEFAULT_CAMPUS_ID) -> str:
    """Get all scheduled classroom bookings, maintenance blocks, and courses for the campus."""
    try:
        workspace = get_workspace(campus_id=campus_id)
        return workspace.json()
    except Exception as e:
        return f"Error fetching room bookings: {e}"

ROOM_TOOLS = [get_room_bookings_and_courses]
