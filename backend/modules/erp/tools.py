from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.erp.service import get_workspace


@tool
def get_personal_academic_calendar(user_id: str) -> str:
    """Get the student's registered courses and personal class calendar for today.
    Use this when the student asks about classes, free time, breaks, schedule conflicts,
    or whether they can go somewhere without missing class.
    """
    try:
        return get_workspace(DEFAULT_CAMPUS_ID, user_id).json()
    except Exception as error:
        return f"Error fetching personal academic calendar: {error}"


ERP_TOOLS = [get_personal_academic_calendar]
