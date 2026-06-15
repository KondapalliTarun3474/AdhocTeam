from typing import Optional
from langchain_core.tools import tool
from modules.campus_rooms.service import DEFAULT_CAMPUS_ID, get_workspace

@tool
def get_room_bookings_and_courses(campus_id: str, date: Optional[str] = None) -> str:
    """Fetch all active global campus room bookings and course details for a specific date.
    Data Returned (JSON): rooms (capacity, type), and bookings (room_name, start_at, end_at, course_code, professor_name, booking_type).
    Use Cases: Use this ONLY to find where a specific professor is teaching, to find empty rooms on campus, or to check global campus room availability.
    Constraints: WARNING: DO NOT use this tool for a student's personal schedule or classes. If a user asks "what classes do I have today?", you MUST use the `get_personal_academic_calendar` tool from ERP instead.
    """
    try:
        from datetime import datetime
        query_date = date or datetime.now().strftime('%Y-%m-%d')
        workspace = get_workspace(campus_id=campus_id, start_date=query_date, end_date=query_date)
        return workspace.json(exclude={"courses"})
    except Exception as e:
        return f"Error fetching room bookings: {e}"

ROOM_TOOLS = [get_room_bookings_and_courses]
