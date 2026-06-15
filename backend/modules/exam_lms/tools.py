from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.exam_lms.service import get_workspace


@tool
def get_exam_portal_quizzes(user_id: str) -> str:
    """Get scheduled quizzes, start/end times, exam rooms, and released quiz scores for the student's registered courses.
    Data Returned (JSON): quizzes (array of title, start_at, end_at, room_name, status, course_code) and scores (array of score, max_score, released boolean).
    Use Cases: Use this when the user asks "when is my midterm?", "where is my quiz?", or "what did I score on the exam?".
    """
    try:
        return get_workspace(DEFAULT_CAMPUS_ID, user_id).json(exclude={"courses"})
    except Exception as error:
        return f"Error fetching exam portal data: {error}"


EXAM_TOOLS = [get_exam_portal_quizzes]
