from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.exam_lms.service import get_workspace


@tool
def get_exam_portal_quizzes(user_id: str) -> str:
    """Get scheduled quizzes, start/end times, rooms, and released quiz scores
    for the student's registered courses.
    """
    try:
        return get_workspace(DEFAULT_CAMPUS_ID, user_id).json()
    except Exception as error:
        return f"Error fetching exam portal data: {error}"


EXAM_TOOLS = [get_exam_portal_quizzes]
