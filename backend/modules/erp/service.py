from datetime import datetime, timezone
from typing import Any, Dict, List

from database import get_supabase
from modules.academics.schemas import AcademicCourse
from modules.academics.service import (
    DEFAULT_CAMPUS_ID,
    DEFAULT_REGISTERED_COURSE_IDS,
    build_daily_personal_calendar,
    find_registration_conflicts,
    list_courses,
    list_sessions,
)
from modules.erp.schemas import (
    CourseRegistrationRecord,
    CourseRegistrationRequest,
    ErpWorkspace,
)


_REGISTRATIONS: Dict[str, List[str]] = {}


def _registration_key(campus_id: str, user_id: str) -> str:
    return f"{campus_id}:{user_id}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_course_ids(user_id: str) -> List[str]:
    return list(DEFAULT_REGISTERED_COURSE_IDS if user_id == "demo-student" else [])


def get_registered_course_ids(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> List[str]:
    key = _registration_key(campus_id, user_id)
    if key not in _REGISTRATIONS:
        _REGISTRATIONS[key] = _default_course_ids(user_id)
    return _REGISTRATIONS[key]


def get_registered_courses(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> List[AcademicCourse]:
    selected = set(get_registered_course_ids(campus_id, user_id))
    return [course for course in list_courses(campus_id) if course.course_id in selected]


def get_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> ErpWorkspace:
    course_ids = get_registered_course_ids(campus_id, user_id)
    return ErpWorkspace(
        campus_id=campus_id,
        user_id=user_id,
        courses=list_courses(campus_id),
        registered_course_ids=course_ids,
        registered_courses=get_registered_courses(campus_id, user_id),
        registered_sessions=list_sessions(campus_id, course_ids),
        personal_calendar=build_daily_personal_calendar(course_ids, campus_id),
    )


def register_course(request: CourseRegistrationRequest, supabase: Any) -> Dict[str, Any]:
    current = get_registered_course_ids(request.campus_id, request.user_id)
    if request.course_id in current:
        return {"status": "success", "data": get_workspace(request.campus_id, request.user_id).dict()}

    course_ids = {course.course_id for course in list_courses(request.campus_id)}
    if request.course_id not in course_ids:
        return {"status": "error", "message": "Unknown course_id."}

    conflicts = find_registration_conflicts(current, request.course_id, request.campus_id)
    if conflicts:
        return {
            "status": "error",
            "message": "Registration blocked because this course overlaps with your current timetable.",
            "conflicts": [conflict.dict() for conflict in conflicts],
        }

    current.append(request.course_id)
    record = CourseRegistrationRecord(
        campus_id=request.campus_id,
        user_id=request.user_id,
        course_id=request.course_id,
        registered_at=_now_iso(),
    )

    if supabase:
        try:
            supabase.table("erp_course_registrations").upsert(
                record.dict(),
                on_conflict="campus_id,user_id,course_id",
            ).execute()
            status = "success"
        except Exception:
            status = "preview"
    else:
        status = "preview"

    return {"status": status, "data": get_workspace(request.campus_id, request.user_id).dict()}


def drop_course(
    campus_id: str,
    user_id: str,
    course_id: str,
    supabase: Any,
) -> Dict[str, Any]:
    current = get_registered_course_ids(campus_id, user_id)
    if course_id in current:
        current.remove(course_id)

    if supabase:
        try:
            supabase.table("erp_course_registrations").delete().eq("campus_id", campus_id).eq("user_id", user_id).eq("course_id", course_id).execute()
            status = "success"
        except Exception:
            status = "preview"
    else:
        status = "preview"

    return {"status": status, "data": get_workspace(campus_id, user_id).dict()}
