from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.erp.service import get_workspace


@tool
def get_personal_academic_calendar(user_id: str) -> str:
    """Get the student's personal registered courses and exact class calendar for today.
    Data Returned (JSON): registered_courses (array of course_code, professor_name, credits), registered_sessions (array of start_time, end_time, room_name, is_tutorial), and personal_calendar (mapping of hours to classes).
    Use Cases: Use this for ALL personal class and schedule queries (e.g. "Do I have class at 2 PM?", "When is my free time?"). Use this proactively when checking if the user can go somewhere without missing class.
    Constraints: Only provides schedule for the specific student. For global campus room availability, use the Rooms tool instead.
    """
    try:
        # Exclude everything except the pre-computed, minimal personal_calendar to save tokens
        return get_workspace(DEFAULT_CAMPUS_ID, user_id).json(exclude={"courses", "registered_course_ids", "registered_courses", "registered_sessions", "campus_id", "user_id"})
    except Exception as error:
        return f"Error fetching personal academic calendar: {error}"


ERP_TOOLS = [get_personal_academic_calendar]
