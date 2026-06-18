import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from modules.academics.schemas import (
    AcademicCourse,
    AcademicRoom,
    CourseConflict,
    CourseSession,
    PersonalCalendarItem,
)


DEFAULT_CAMPUS_ID = "00000000-0000-0000-0000-000000000000"
DEFAULT_USER_ID = "demo-student"
CATALOG_FILE = Path(__file__).with_name("default_courses.json")
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
COLOR_KEYS = ["blue", "orange", "cyan", "ink"]

DEFAULT_REGISTERED_COURSE_IDS = [
    "aid-836-3d-computer-vision",
    "aid-608-networks-and-semantics-i",
    "ait-512-mathematics-for-machine-learning",
    "das-732-data-visualization",
    "ait-707-theory-of-large-language-models",
]


def _catalog() -> Dict:
    with CATALOG_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def _with_campus(row: Dict, campus_id: str) -> Dict:
    return {**row, "campus_id": campus_id}


def list_courses(campus_id: str = DEFAULT_CAMPUS_ID) -> List[AcademicCourse]:
    return [
        AcademicCourse(**_with_campus(course, campus_id))
        for course in _catalog()["courses"]
    ]


def list_rooms(campus_id: str = DEFAULT_CAMPUS_ID) -> List[AcademicRoom]:
    return [
        AcademicRoom(**_with_campus(room, campus_id))
        for room in _catalog()["rooms"]
    ]


def list_sessions(
    campus_id: str = DEFAULT_CAMPUS_ID,
    course_ids: Optional[Iterable[str]] = None,
) -> List[CourseSession]:
    selected = set(course_ids or [])
    sessions = []
    for session in _catalog()["sessions"]:
        if selected and session["course_id"] not in selected:
            continue
        sessions.append(CourseSession(**_with_campus(session, campus_id)))
    return sessions


def get_course(
    course_id: str,
    campus_id: str = DEFAULT_CAMPUS_ID,
) -> Optional[AcademicCourse]:
    return next((course for course in list_courses(campus_id) if course.course_id == course_id), None)


def courses_by_id(campus_id: str = DEFAULT_CAMPUS_ID) -> Dict[str, AcademicCourse]:
    return {course.course_id: course for course in list_courses(campus_id)}


def minutes_for(value: str) -> int:
    hours, minutes = [int(part) for part in value.split(":")]
    return (hours * 60) + minutes


def display_time(value: str) -> str:
    total = minutes_for(value)
    hour = total // 60
    minute = total % 60
    period = "PM" if hour >= 12 else "AM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute:02d} {period}"


def _sessions_overlap(left: CourseSession, right: CourseSession) -> bool:
    if left.day_index != right.day_index:
        return False
    return (
        minutes_for(left.start_time) < minutes_for(right.end_time)
        and minutes_for(right.start_time) < minutes_for(left.end_time)
    )


def find_registration_conflicts(
    existing_course_ids: Sequence[str],
    candidate_course_id: str,
    campus_id: str = DEFAULT_CAMPUS_ID,
) -> List[CourseConflict]:
    existing_sessions = list_sessions(campus_id, existing_course_ids)
    candidate_sessions = list_sessions(campus_id, [candidate_course_id])
    courses = courses_by_id(campus_id)
    conflicts: List[CourseConflict] = []

    for candidate in candidate_sessions:
        for existing in existing_sessions:
            if _sessions_overlap(candidate, existing):
                course = courses[candidate.course_id]
                conflicts.append(
                    CourseConflict(
                        course_id=course.course_id,
                        course_code=course.course_code,
                        course_name=course.course_name,
                        conflicts_with=f"{existing.course_code} - {existing.course_name}",
                        day=candidate.day,
                        start_label=candidate.start_label,
                        end_label=candidate.end_label,
                    )
                )
    return conflicts


def _week_start(value: Optional[str] = None) -> date:
    selected = date.fromisoformat(value) if value else date.today()
    return selected - timedelta(days=selected.weekday())


def session_datetimes(session: CourseSession, week_start: Optional[str] = None) -> Tuple[str, str]:
    start_date = _week_start(week_start) + timedelta(days=session.day_index)
    start_hours, start_minutes = [int(part) for part in session.start_time.split(":")]
    end_hours, end_minutes = [int(part) for part in session.end_time.split(":")]
    start_at = datetime.combine(start_date, time(start_hours, start_minutes)).isoformat()
    end_at = datetime.combine(start_date, time(end_hours, end_minutes)).isoformat()
    return start_at, end_at


def registered_course_ids(user_id: str = DEFAULT_USER_ID) -> List[str]:
    # ERP owns runtime registration changes; this default keeps other modules useful offline.
    return list(DEFAULT_REGISTERED_COURSE_IDS)


def build_daily_personal_calendar(
    course_ids: Sequence[str],
    campus_id: str = DEFAULT_CAMPUS_ID,
    target_date: Optional[str] = None,
) -> Dict:
    selected_date = date.fromisoformat(target_date) if target_date else date.today()
    day_index = selected_date.weekday()
    sessions = [
        session for session in list_sessions(campus_id, course_ids)
        if session.day_index == day_index
    ]
    sessions.sort(key=lambda session: session.start_time)
    items: List[PersonalCalendarItem] = []

    for index, session in enumerate(sessions):
        if index > 0:
            previous = sessions[index - 1]
            if minutes_for(previous.end_time) < minutes_for(session.start_time):
                items.append(
                    PersonalCalendarItem(
                        id=f"break-{previous.session_id}-{session.session_id}",
                        type="break",
                        label="Break",
                        start_time=previous.end_time,
                        end_time=session.start_time,
                        start_label=previous.end_label,
                        end_label=session.start_label,
                        color_key="cyan",
                    )
                )
        items.append(
            PersonalCalendarItem(
                id=session.session_id,
                type=session.session_type,
                label=f"{session.course_code} · {session.room_name}",
                course_id=session.course_id,
                course_code=session.course_code,
                course_name=session.course_name,
                professor_name=session.professor_name,
                room_name=session.room_name,
                start_time=session.start_time,
                end_time=session.end_time,
                start_label=session.start_label,
                end_label=session.end_label,
                color_key=COLOR_KEYS[index % len(COLOR_KEYS)],
            )
        )

    return {
        "date": selected_date.isoformat(),
        "day_name": DAY_NAMES[day_index],
        "items": [item.dict() for item in items],
    }
