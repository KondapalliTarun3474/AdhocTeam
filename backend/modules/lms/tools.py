from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.lms.service import get_workspace


@tool
def get_lms_assignments(user_id: str) -> str:
    """Get LMS assignments and deadlines for the student's registered courses.
    Use this when the student asks what assignments are due, what deadlines are coming,
    or whether they have coursework to finish before making plans.
    """
    try:
        return get_workspace(DEFAULT_CAMPUS_ID, user_id).json()
    except Exception as error:
        return f"Error fetching LMS assignments: {error}"


LMS_TOOLS = [get_lms_assignments]
