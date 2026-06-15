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
def draft_campus_leave_application(
    user_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    destination: Optional[str] = None,
    reason: Optional[str] = None,
    emergency_contact: Optional[str] = None,
    leave_type: str = "casual",
    departure_time: str = "08:00",
    return_time: str = "20:00",
) -> str:
    """Use this tool FIRST whenever a user asks to apply for a leave. It ONLY generates a draft.
    NEVER use this tool for a Casual Outing like going to the mall.
    If the user is missing required details (dates, destination, reason, emergency_contact), you MUST ask them for the missing info before calling this tool.
    For `emergency_contact`, if they say "use my number" or "use my guardian's number", pass that exact phrase and the tool will resolve it.
    """
    try:
        profile = _profile_for(DEFAULT_CAMPUS_ID, user_id)
        if not profile:
            return "ERROR: Student profile not found."

        # 1. Check for missing data
        if not all([from_date, to_date, destination, reason, emergency_contact]):
            return "ERROR: You are missing required details. You MUST ask the user to provide their exact destination, reason, and an emergency contact."

        # 2. Resolve emergency contact
        resolved_contact = emergency_contact
        if "my number" in str(emergency_contact).lower() or "my phone" in str(emergency_contact).lower():
            resolved_contact = profile.phone
        elif "guardian" in str(emergency_contact).lower() or "parent" in str(emergency_contact).lower() or "mother" in str(emergency_contact).lower() or "father" in str(emergency_contact).lower():
            resolved_contact = profile.guardian_phone

        # 3. Draft Mode Output
        return (
            f"DRAFT GENERATED SUCCESSFULLY. DO NOT SAVE TO DATABASE. "
            f"You MUST reply to the user with a summary of these exact leave details: "
            f"Dates: {from_date} to {to_date}, Destination: {destination}, Reason: {reason}, "
            f"Emergency Contact: {resolved_contact}. "
            f"Also explicitly state that their registered guardian ({profile.guardian_email}) will be notified. "
            f"You MUST ask: 'Are these details correct? Should I submit the application?'"
        )
    except Exception as e:
        return f"Failed to draft leave: {e}"


@tool
def submit_campus_leave_application(
    user_id: str,
    from_date: str,
    to_date: str,
    destination: str,
    reason: str,
    emergency_contact: str,
    leave_type: str = "casual",
    departure_time: str = "08:00",
    return_time: str = "20:00",
    student_name: Optional[str] = None
) -> str:
    """Use this tool to officially submit the leave to the database.
    WARNING: You are STRICTLY FORBIDDEN from using this tool unless you have ALREADY generated a draft using `draft_campus_leave_application` AND the user explicitly replied 'Yes' to that draft.
    """
    try:
        profile = _profile_for(DEFAULT_CAMPUS_ID, user_id)
        if not profile:
            return "Failed to apply: Student profile not found."

        # GUARANTEE: Guardian details are strictly pulled from the database
        guardian_email = profile.guardian_email
        guardian_phone = profile.guardian_phone
        guardian_relation = profile.guardian_relation

        # Resolve emergency contact
        resolved_contact = emergency_contact
        if "my number" in str(emergency_contact).lower() or "my phone" in str(emergency_contact).lower():
            resolved_contact = profile.phone
        elif "guardian" in str(emergency_contact).lower() or "parent" in str(emergency_contact).lower() or "mother" in str(emergency_contact).lower() or "father" in str(emergency_contact).lower():
            resolved_contact = profile.guardian_phone

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
            emergency_contact=resolved_contact
        )
        res = create_application(req, get_supabase())
        return str(res)
    except Exception as e:
        return f"Failed to submit leave: {e}"

LEAVE_TOOLS = [check_leave_status, get_student_profile, draft_campus_leave_application, submit_campus_leave_application]
