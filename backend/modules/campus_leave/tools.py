from typing import Optional
from langchain_core.tools import tool
from database import get_supabase
from modules.campus_leave.service import DEFAULT_CAMPUS_ID, active_leave_for_student, create_application, _profile_for
from modules.campus_leave.schemas import LeaveApplicationRequest

@tool
def check_leave_status(user_id: str) -> str:
    """Check the current active or pending campus leave application for a student."""
    try:
        leave = active_leave_for_student(campus_id=DEFAULT_CAMPUS_ID, user_id=user_id)
        if leave:
            return leave.json()
        return "No active leave applications found."
    except Exception as e:
        return f"Error checking leave status: {e}"

@tool
def get_student_profile(user_id: str) -> str:
    """Get the student's profile information, including their curfew violations."""
    try:
        profile = _profile_for(DEFAULT_CAMPUS_ID, user_id)
        if profile:
            return profile.json()
        return "Profile not found."
    except Exception as e:
        return f"Error fetching profile: {e}"

@tool
def apply_for_campus_leave(
    user_id: str,
    from_date: str,
    to_date: str,
    destination: str,
    reason: str,
    guardian_relation: str,
    guardian_email: str,
    guardian_phone: str,
    leave_type: str = "casual",
    departure_time: str = "08:00",
    return_time: str = "20:00",
    student_name: Optional[str] = None,
    emergency_contact: Optional[str] = None
) -> str:
    """Apply for a campus leave (gate-pass).
    Use this tool ONLY when the user explicitly wants to apply for a formal leave.
    """
    try:
        profile = _profile_for(DEFAULT_CAMPUS_ID, user_id)
        if not profile:
            return "Failed to apply: Student profile not found."
            
        req = LeaveApplicationRequest(
            campus_id=DEFAULT_CAMPUS_ID,
            user_id=user_id,
            student_name=student_name or profile.student_name,
            from_date=from_date,
            to_date=to_date,
            departure_time=departure_time,
            return_time=return_time,
            leave_type=leave_type,
            destination=destination,
            reason=reason,
            guardian_relation=guardian_relation,
            guardian_email=guardian_email,
            guardian_phone=guardian_phone,
            emergency_contact=emergency_contact or profile.phone
        )
        res = create_application(req, get_supabase())
        return str(res)
    except Exception as e:
        return f"Failed to apply for leave: {e}"

LEAVE_TOOLS = [check_leave_status, get_student_profile, apply_for_campus_leave]
