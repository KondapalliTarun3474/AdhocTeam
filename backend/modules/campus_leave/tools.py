from typing import Optional
from langchain_core.tools import tool
from database import get_supabase
from modules.campus_leave.service import DEFAULT_CAMPUS_ID, active_leave_for_student, create_application, _profile_for
from modules.campus_leave.schemas import LeaveApplicationRequest

@tool
def check_leave_status(user_id: str) -> str:
    """Check if the student currently has an active or pending formal leave application.
    Returns the details of their current leave (if any).
    Use this when the user asks if their leave was approved or if they have active leaves.
    """
    try:
        leave = active_leave_for_student(campus_id=DEFAULT_CAMPUS_ID, user_id=user_id)
        if leave:
            return leave.json()
        return "No active leave applications found."
    except Exception as e:
        return f"Error checking leave status: {e}"

@tool
def get_student_profile(user_id: str) -> str:
    """Get the student's profile information, specifically their curfew violations and emergency contacts.
    Returns the student's name, phone, and total number of curfew_violations.
    Use this when the user is planning a Casual Outing (like going to the mall or skipping dinner).
    You must check their curfew_violations. If they have 4 or more, warn them they must return before 10:30 PM.
    """
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
    """Submit a formal leave application (gate-pass) to the database.
    Creates a new leave request pending approval.
    Use this ONLY when the user explicitly asks to apply for leave, go home for the weekend, or take a medical leave.
    NEVER use this tool for a Casual Outing like going to the mall.
    If the user is missing required details like dates, destination, reason, guardian email/phone, you MUST ask them for the missing info before calling this tool.
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
