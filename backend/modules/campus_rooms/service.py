import uuid
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional

from database import get_supabase
from modules.academics.service import (
    list_courses as list_academic_courses,
    list_rooms as list_academic_rooms,
    list_sessions as list_academic_sessions,
    session_datetimes,
)
from modules.campus_rooms.schemas import (
    CampusRoomsWorkspace,
    CourseSchema,
    RoomBookingCreateRequest,
    RoomBookingRecord,
    RoomBookingStatusUpdate,
    RoomBookingType,
    RoomConfigUpdateRequest,
    RoomModuleMode,
    RoomSchema,
    RoomSetupConfig,
)


DEFAULT_CAMPUS_ID = "00000000-0000-0000-0000-000000000000"

_CONFIGS: Dict[str, RoomSetupConfig] = {}
_CONFIG_JSON: Dict[str, Dict[str, Any]] = {}
_ROOMS: Dict[str, List[RoomSchema]] = {}
_COURSES: Dict[str, List[CourseSchema]] = {}
_BOOKINGS: Dict[str, List[RoomBookingRecord]] = {}


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _week_start(value: Optional[str] = None) -> date:
    selected = date.fromisoformat(value) if value else date.today()
    return selected - timedelta(days=selected.weekday())


def _at(day: date, hour: int, minute: int = 0) -> str:
    return datetime.combine(day, time(hour, minute)).isoformat()


def _default_config(campus_id: str) -> RoomSetupConfig:
    return RoomSetupConfig(
        campus_id=campus_id,
        mode=RoomModuleMode.DEFAULT_APP,
        source_url="https://campus.iiitb.net",
        is_active=True,
    )


def _normalize_config_json(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _get_config_json(campus_id: str, supabase: Any = None) -> Dict[str, Any]:
    db = supabase or get_supabase()
    if db:
        try:
            response = (
                db.table("module_configs")
                .select("config_json")
                .eq("campus_id", campus_id)
                .eq("module_key", "campus_rooms")
                .execute()
            )
            if response.data:
                return _normalize_config_json(response.data[0].get("config_json"))
        except Exception:
            pass
    return _CONFIG_JSON.get(campus_id, {})


def _seed_rooms(campus_id: str) -> List[RoomSchema]:
    return [
        RoomSchema(**room.dict())
        for room in list_academic_rooms(campus_id)
    ]


def _seed_courses(campus_id: str) -> List[CourseSchema]:
    return [
        CourseSchema(
            campus_id=course.campus_id,
            course_id=course.course_id,
            course_code=course.course_code,
            course_name=course.course_name,
            term=course.term,
            professor_id=course.professor_id,
            professor_name=course.professor_name,
            department=course.department,
        )
        for course in list_academic_courses(campus_id)
    ]


def _course_lookup(campus_id: str) -> Dict[str, CourseSchema]:
    return {course.course_id: course for course in list_courses(campus_id)}


def _room_lookup(campus_id: str) -> Dict[str, RoomSchema]:
    return {room.room_id: room for room in list_rooms(campus_id)}


def _seed_bookings(campus_id: str) -> List[RoomBookingRecord]:
    bookings = []
    for session in list_academic_sessions(campus_id):
        start_at, end_at = session_datetimes(session)
        bookings.append(
            RoomBookingRecord(
                id=f"class-{session.session_id}",
                campus_id=campus_id,
                room_id=session.room_id,
                room_name=session.room_name,
                title=session.title,
                booking_type=RoomBookingType.CLASS,
                start_at=start_at,
                end_at=end_at,
                course_id=session.course_id,
                course_code=session.course_code,
                course_name=session.course_name,
                professor_id=session.professor_id,
                professor_name=session.professor_name,
                created_by="timetable",
                notes="Tutorial" if session.is_tutorial else None,
            )
        )
    return bookings


def get_config(campus_id: str = DEFAULT_CAMPUS_ID, supabase: Any = None) -> RoomSetupConfig:
    db = supabase or get_supabase()
    if db:
        try:
            response = (
                db.table("module_configs")
                .select("campus_id,module_key,module_mode,source_url,is_active,last_synced_at,config_json")
                .eq("campus_id", campus_id)
                .eq("module_key", "campus_rooms")
                .execute()
            )
            if response.data:
                row = response.data[0]
                _CONFIG_JSON[campus_id] = _normalize_config_json(row.get("config_json"))
                return RoomSetupConfig(
                    campus_id=row["campus_id"],
                    module_key=row.get("module_key", "campus_rooms"),
                    mode=row.get("module_mode") or RoomModuleMode.DEFAULT_APP,
                    source_url=row.get("source_url"),
                    is_active=row.get("is_active", True),
                    last_synced_at=row.get("last_synced_at"),
                )
        except Exception:
            pass
    return _CONFIGS.get(campus_id, _default_config(campus_id))


def save_config(request: RoomConfigUpdateRequest, supabase: Any) -> Dict[str, Any]:
    config = RoomSetupConfig(
        campus_id=request.campus_id,
        mode=request.mode,
        source_url=request.source_url,
        is_active=request.is_active,
    )
    _CONFIGS[request.campus_id] = config
    config_json = _get_config_json(request.campus_id, supabase)
    _CONFIG_JSON[request.campus_id] = config_json
    if not supabase:
        return {"status": "preview", "data": config.dict()}

    row = {
        "campus_id": config.campus_id,
        "module_key": "campus_rooms",
        "module_mode": config.mode.value,
        "source_url": config.source_url,
        "is_active": config.is_active,
        "config_json": config_json,
    }
    response = (
        supabase.table("module_configs")
        .upsert(row, on_conflict="campus_id,module_key")
        .execute()
    )
    return {"status": "success", "data": response.data}


def list_rooms(campus_id: str = DEFAULT_CAMPUS_ID) -> List[RoomSchema]:
    if campus_id not in _ROOMS:
        _ROOMS[campus_id] = _seed_rooms(campus_id)
    return _ROOMS[campus_id]


def list_courses(campus_id: str = DEFAULT_CAMPUS_ID) -> List[CourseSchema]:
    if campus_id not in _COURSES:
        _COURSES[campus_id] = _seed_courses(campus_id)
    return _COURSES[campus_id]


def list_bookings(
    campus_id: str = DEFAULT_CAMPUS_ID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[RoomBookingRecord]:
    if campus_id not in _BOOKINGS:
        _BOOKINGS[campus_id] = _seed_bookings(campus_id)

    bookings = _BOOKINGS[campus_id]
    if not start_date and not end_date:
        return sorted(bookings, key=lambda booking: booking.start_at)

    start_value = f"{start_date}T00:00:00" if start_date else ""
    end_value = f"{end_date}T23:59:59" if end_date else "9999-12-31T23:59:59"
    return sorted(
        [
            booking for booking in bookings
            if start_value <= booking.start_at <= end_value
        ],
        key=lambda booking: booking.start_at,
    )


def next_booking(campus_id: str = DEFAULT_CAMPUS_ID) -> Optional[RoomBookingRecord]:
    now = datetime.now().isoformat()
    upcoming = [
        booking for booking in list_bookings(campus_id)
        if booking.end_at >= now and booking.status in {"confirmed", "blocked"}
    ]
    return sorted(upcoming, key=lambda booking: booking.start_at)[0] if upcoming else None


def create_booking(request: RoomBookingCreateRequest, supabase: Any) -> Dict[str, Any]:
    rooms = _room_lookup(request.campus_id)
    room = rooms.get(request.room_id)
    if not room:
        raise ValueError("Unknown room_id")

    course = _course_lookup(request.campus_id).get(request.course_id or "")
    status = "blocked" if request.booking_type == RoomBookingType.BLOCK else "confirmed"
    record = RoomBookingRecord(
        id=str(uuid.uuid4()),
        campus_id=request.campus_id,
        room_id=room.room_id,
        room_name=room.room_name,
        title=request.title,
        booking_type=request.booking_type,
        start_at=request.start_at,
        end_at=request.end_at,
        status=status,
        course_id=course.course_id if course else request.course_id,
        course_code=course.course_code if course else None,
        course_name=course.course_name if course else None,
        professor_id=course.professor_id if course else request.professor_id,
        professor_name=course.professor_name if course else request.professor_name,
        created_by=request.created_by,
        notes=request.notes,
    )
    _BOOKINGS.setdefault(request.campus_id, _seed_bookings(request.campus_id)).append(record)
    if not supabase:
        return {"status": "preview", "data": record.dict()}

    try:
        response = supabase.table("campus_room_bookings").insert(record.dict()).execute()
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": record.dict()}


def update_booking_status(
    campus_id: str,
    booking_id: str,
    request: RoomBookingStatusUpdate,
    supabase: Any,
) -> Dict[str, Any]:
    updated = None
    bookings = _BOOKINGS.setdefault(campus_id, _seed_bookings(campus_id))
    for index, booking in enumerate(bookings):
        if booking.id == booking_id:
            updated = RoomBookingRecord(
                **{
                    **booking.dict(),
                    "status": request.status,
                    "notes": request.notes or booking.notes,
                }
            )
            bookings[index] = updated
            break

    if not supabase:
        return {"status": "preview", "data": updated.dict() if updated else None}

    try:
        response = (
            supabase.table("campus_room_bookings")
            .update({"status": request.status, "notes": request.notes})
            .eq("campus_id", campus_id)
            .eq("id", booking_id)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": updated.dict() if updated else None}


def get_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> CampusRoomsWorkspace:
    return CampusRoomsWorkspace(
        config=get_config(campus_id=campus_id),
        rooms=list_rooms(campus_id),
        courses=list_courses(campus_id),
        bookings=list_bookings(campus_id, start_date, end_date),
        next_booking=next_booking(campus_id),
    )


def format_calendar_item(booking: RoomBookingRecord) -> Dict[str, str]:
    start = datetime.fromisoformat(booking.start_at)
    return {
        "time": start.strftime("%H:%M"),
        "title": f"{booking.room_name}: {booking.title}",
        "module_key": "campus_rooms",
    }
