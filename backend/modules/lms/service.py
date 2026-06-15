import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from database import get_supabase
from modules.academics.service import DEFAULT_CAMPUS_ID, list_courses
from modules.erp.service import get_registered_course_ids
from modules.lms.schemas import (
    AssignmentCreateRequest,
    AssignmentRecord,
    AssignmentSubmissionRecord,
    LmsWorkspace,
)


_ASSIGNMENTS: Dict[str, List[AssignmentRecord]] = {}
_SUBMISSIONS: List[AssignmentSubmissionRecord] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_assignments(campus_id: str = DEFAULT_CAMPUS_ID) -> List[AssignmentRecord]:
    today = datetime.now().date()
    assignments = []
    for index, course in enumerate(list_courses(campus_id)):
        due_date = today + timedelta(days=3 + (index % 14))
        assignments.append(
            AssignmentRecord(
                id=f"asg-{course.course_id}",
                campus_id=campus_id,
                course_id=course.course_id,
                course_code=course.course_code,
                course_name=course.course_name,
                title="Assignment 1",
                description=f"Submit a PDF response for {course.course_code}.",
                deadline_at=f"{due_date.isoformat()}T23:59:00",
                created_by=course.professor_id,
            )
        )
    return assignments


def list_assignments(
    campus_id: str = DEFAULT_CAMPUS_ID,
    course_ids: Optional[List[str]] = None,
) -> List[AssignmentRecord]:
    if campus_id not in _ASSIGNMENTS:
        _ASSIGNMENTS[campus_id] = _seed_assignments(campus_id)
    assignments = _ASSIGNMENTS[campus_id]
    if course_ids:
        selected = set(course_ids)
        assignments = [assignment for assignment in assignments if assignment.course_id in selected]
    return sorted(assignments, key=lambda assignment: assignment.deadline_at)


def list_submissions(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> List[AssignmentSubmissionRecord]:
    return [
        submission for submission in _SUBMISSIONS
        if submission.campus_id == campus_id and submission.user_id == user_id
    ]


def create_assignment(request: AssignmentCreateRequest, supabase: Any) -> Dict[str, Any]:
    course = next((item for item in list_courses(request.campus_id) if item.course_id == request.course_id), None)
    if not course:
        return {"status": "error", "message": "Unknown course_id."}

    assignment = AssignmentRecord(
        id=str(uuid.uuid4()),
        campus_id=request.campus_id,
        course_id=course.course_id,
        course_code=course.course_code,
        course_name=course.course_name,
        title=request.title,
        description=request.description,
        deadline_at=request.deadline_at,
        created_by=request.created_by or course.professor_id,
    )
    _ASSIGNMENTS.setdefault(request.campus_id, _seed_assignments(request.campus_id)).append(assignment)

    if supabase:
        try:
            supabase.table("lms_assignments").insert(assignment.dict()).execute()
            status = "success"
        except Exception:
            status = "preview"
    else:
        status = "preview"
    return {"status": status, "data": assignment.dict()}


def save_submission(
    campus_id: str,
    assignment_id: str,
    course_id: str,
    user_id: str,
    filename: str,
    content_type: str,
    payload: bytes,
    supabase: Any,
) -> Dict[str, Any]:
    if not filename.lower().endswith(".pdf"):
        return {"status": "error", "message": "Only PDF submissions are accepted."}

    record = AssignmentSubmissionRecord(
        id=str(uuid.uuid4()),
        campus_id=campus_id,
        assignment_id=assignment_id,
        course_id=course_id,
        user_id=user_id,
        filename=filename,
        content_type=content_type or "application/pdf",
        size_bytes=len(payload),
        submitted_at=_now_iso(),
    )
    _SUBMISSIONS.append(record)

    if supabase:
        try:
            supabase.table("lms_assignment_submissions").insert(record.dict()).execute()
            status = "success"
        except Exception:
            status = "preview"
    else:
        status = "preview"
    return {"status": status, "data": record.dict()}


def get_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    include_all: bool = False,
) -> LmsWorkspace:
    course_ids = None if include_all else get_registered_course_ids(campus_id, user_id)
    courses = list_courses(campus_id)
    if course_ids:
        selected = set(course_ids)
        courses = [course for course in courses if course.course_id in selected]
    return LmsWorkspace(
        campus_id=campus_id,
        user_id=user_id,
        courses=courses,
        assignments=list_assignments(campus_id, course_ids),
        submissions=list_submissions(campus_id, user_id),
    )
