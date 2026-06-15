from langchain_core.tools import tool

from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.lms.service import get_workspace


@tool
def get_lms_assignments(user_id: str) -> str:
    """Get LMS assignments, deadlines, and submission status for the student's registered courses.
    Data Returned (JSON): assignments (array of title, description, deadline_at, created_by, course_name) and submissions (array of filename, status, submitted_at).
    Use Cases: Use this when the student asks "what assignments are due?", "when is my deadline?", or "did I submit my homework?". Use this proactively to check whether they have coursework to finish before making plans for outings.
    """
    try:
        return get_workspace(DEFAULT_CAMPUS_ID, user_id).json(exclude={"courses"})
    except Exception as error:
        return f"Error fetching LMS assignments: {error}"


LMS_TOOLS = [get_lms_assignments]
