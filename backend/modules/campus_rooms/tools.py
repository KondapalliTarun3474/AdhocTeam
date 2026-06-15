from typing import Optional
from langchain_core.tools import tool
from modules.campus_rooms.service import DEFAULT_CAMPUS_ID, get_workspace

@tool
def get_room_bookings_and_courses(campus_id: str) -> str:
    """Get all scheduled courses, classes, and room bookings for the campus.
    Returns a schedule of times and locations for the student's classes.
    Use this when the user asks what classes they have tomorrow, or when the user is planning an outing or leave to check their schedule and warn them if they will miss any upcoming classes.
    """
    try:
        workspace = get_workspace(campus_id=campus_id)
        return workspace.json()
    except Exception as e:
        return f"Error fetching room bookings: {e}"

ROOM_TOOLS = [get_room_bookings_and_courses]
