import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from core.rbac import Designation, Role
from database import get_supabase
from modules.campus_leave.schemas import (
    CampusLeaveWorkspace,
    CurfewViolationUpdate,
    LeaveApplicationRecord,
    LeaveApplicationRequest,
    LeaveConfigUpdateRequest,
    LeaveModuleMode,
    LeaveSetupConfig,
    LeaveStatusUpdate,
    StudentRoomProfile,
)


DEFAULT_CAMPUS_ID = "00000000-0000-0000-0000-000000000000"

_CONFIGS: Dict[str, LeaveSetupConfig] = {}
_CONFIG_JSON: Dict[str, Dict[str, Any]] = {}
_PROFILES: Dict[str, List[StudentRoomProfile]] = {}
_APPLICATIONS: Dict[str, List[LeaveApplicationRecord]] = {}


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _default_config(campus_id: str) -> LeaveSetupConfig:
    return LeaveSetupConfig(
        campus_id=campus_id,
        mode=LeaveModuleMode.DEFAULT_APP,
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
                .eq("module_key", "campus_leave")
                .execute()
            )
            if response.data:
                return _normalize_config_json(response.data[0].get("config_json"))
        except Exception:
            pass
    return _CONFIG_JSON.get(campus_id, {})


def _seed_profiles(campus_id: str) -> List[StudentRoomProfile]:
    return [
        StudentRoomProfile(
            campus_id=campus_id,
            user_id="demo-student",
            student_name="Tahir Demo",
            email="tahir.demo@iiitb.ac.in",
            phone="+91 98765 43210",
            program="Integrated M.Tech",
            batch="2026",
            hostel="BH-1",
            room_number="B-312",
            guardian_name="Amina Demo",
            guardian_relation="Mother",
            guardian_email="amina.demo@example.com",
            guardian_phone="+91 99887 77665",
            curfew_violations=1,
        ),
        StudentRoomProfile(
            campus_id=campus_id,
            user_id="student-ananya",
            student_name="Ananya Rao",
            email="ananya.rao@iiitb.ac.in",
            phone="+91 90000 11111",
            program="M.Tech CSE",
            batch="2025",
            hostel="GH-2",
            room_number="G-204",
            guardian_name="Ravi Rao",
            guardian_relation="Father",
            guardian_email="ravi.rao@example.com",
            guardian_phone="+91 90000 22222",
            curfew_violations=0,
        ),
        StudentRoomProfile(
            campus_id=campus_id,
            user_id="student-rahul",
            student_name="Rahul Menon",
            email="rahul.menon@iiitb.ac.in",
            phone="+91 90000 33333",
            program="M.Tech ECE",
            batch="2025",
            hostel="BH-2",
            room_number="C-118",
            guardian_name="Leela Menon",
            guardian_relation="Guardian",
            guardian_email="leela.menon@example.com",
            guardian_phone="+91 90000 44444",
            curfew_violations=3,
        ),
    ]


def _seed_applications(campus_id: str) -> List[LeaveApplicationRecord]:
    today = date.today()
    return [
        LeaveApplicationRecord(
            id=str(uuid.uuid4()),
            campus_id=campus_id,
            user_id="demo-student",
            student_name="Tahir Demo",
            from_date=(today + timedelta(days=2)).isoformat(),
            to_date=(today + timedelta(days=4)).isoformat(),
            departure_time="18:00",
            return_time="20:30",
            leave_type="Home visit",
            destination="Bengaluru",
            reason="Family function",
            guardian_relation="Mother",
            guardian_email="amina.demo@example.com",
            guardian_phone="+91 99887 77665",
            emergency_contact="+91 98765 43210",
            status="submitted",
            submitted_at=_now_iso(),
        ),
        LeaveApplicationRecord(
            id=str(uuid.uuid4()),
            campus_id=campus_id,
            user_id="student-ananya",
            student_name="Ananya Rao",
            from_date=(today - timedelta(days=5)).isoformat(),
            to_date=(today - timedelta(days=3)).isoformat(),
            departure_time="09:30",
            return_time="19:30",
            leave_type="Medical",
            destination="Indiranagar",
            reason="Doctor appointment",
            guardian_relation="Father",
            guardian_email="ravi.rao@example.com",
            guardian_phone="+91 90000 22222",
            emergency_contact="+91 90000 11111",
            status="security_checked_in",
            submitted_at=(datetime.utcnow() - timedelta(days=8)).isoformat(),
            reviewed_by="warden-demo",
            reviewed_at=(datetime.utcnow() - timedelta(days=7)).isoformat(),
            security_notes="Returned before curfew.",
        ),
    ]


def _profile_for(campus_id: str, user_id: str) -> StudentRoomProfile:
    profiles = list_student_profiles(campus_id)
    for profile in profiles:
        if profile.user_id == user_id:
            return profile
    return StudentRoomProfile(
        campus_id=campus_id,
        user_id=user_id,
        student_name="Demo Student",
        email="student@iiitb.ac.in",
        phone="+91 90000 00000",
        program="M.Tech",
        batch="2026",
        hostel="BH-1",
        room_number="TBD",
        guardian_name="Guardian",
        guardian_relation="Guardian",
        guardian_email="guardian@example.com",
        guardian_phone="+91 90000 00001",
        curfew_violations=0,
    )


def _has_designation(designations: Iterable[Designation], designation: Designation) -> bool:
    return designation in set(designations)


def get_config(campus_id: str = DEFAULT_CAMPUS_ID, supabase: Any = None) -> LeaveSetupConfig:
    db = supabase or get_supabase()
    if db:
        try:
            response = (
                db.table("module_configs")
                .select("campus_id,module_key,module_mode,source_url,is_active,last_synced_at,config_json")
                .eq("campus_id", campus_id)
                .eq("module_key", "campus_leave")
                .execute()
            )
            if response.data:
                row = response.data[0]
                _CONFIG_JSON[campus_id] = _normalize_config_json(row.get("config_json"))
                return LeaveSetupConfig(
                    campus_id=row["campus_id"],
                    module_key=row.get("module_key", "campus_leave"),
                    mode=row.get("module_mode") or LeaveModuleMode.DEFAULT_APP,
                    source_url=row.get("source_url"),
                    is_active=row.get("is_active", True),
                    last_synced_at=row.get("last_synced_at"),
                )
        except Exception:
            pass
    return _CONFIGS.get(campus_id, _default_config(campus_id))


def save_config(request: LeaveConfigUpdateRequest, supabase: Any) -> Dict[str, Any]:
    config = LeaveSetupConfig(
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
        "module_key": "campus_leave",
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


def list_student_profiles(campus_id: str = DEFAULT_CAMPUS_ID) -> List[StudentRoomProfile]:
    if campus_id not in _PROFILES:
        _PROFILES[campus_id] = _seed_profiles(campus_id)
    return _PROFILES[campus_id]


def list_applications(campus_id: str = DEFAULT_CAMPUS_ID) -> List[LeaveApplicationRecord]:
    if campus_id not in _APPLICATIONS:
        _APPLICATIONS[campus_id] = _seed_applications(campus_id)
    return sorted(_APPLICATIONS[campus_id], key=lambda record: record.submitted_at, reverse=True)


def list_applications_for_student(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> List[LeaveApplicationRecord]:
    return [
        record for record in list_applications(campus_id)
        if record.user_id == user_id
    ]


def create_application(request: LeaveApplicationRequest, supabase: Any) -> Dict[str, Any]:
    record = LeaveApplicationRecord(
        **request.dict(),
        id=str(uuid.uuid4()),
        status="submitted",
        submitted_at=_now_iso(),
    )
    _APPLICATIONS.setdefault(request.campus_id, _seed_applications(request.campus_id)).insert(0, record)
    if not supabase:
        return {"status": "preview", "data": record.dict()}

    try:
        response = supabase.table("campus_leave_applications").insert(record.dict()).execute()
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": record.dict()}


def update_application_status(
    campus_id: str,
    application_id: str,
    request: LeaveStatusUpdate,
    supabase: Any,
) -> Dict[str, Any]:
    updated = None
    applications = _APPLICATIONS.setdefault(campus_id, _seed_applications(campus_id))
    for index, application in enumerate(applications):
        if application.id == application_id:
            updated = LeaveApplicationRecord(
                **{
                    **application.dict(),
                    "status": request.status,
                    "reviewed_by": request.reviewed_by or application.reviewed_by,
                    "reviewed_at": _now_iso(),
                    "security_notes": request.security_notes or application.security_notes,
                }
            )
            applications[index] = updated
            break

    if not supabase:
        return {"status": "preview", "data": updated.dict() if updated else None}

    try:
        response = (
            supabase.table("campus_leave_applications")
            .update({
                "status": request.status,
                "reviewed_by": request.reviewed_by,
                "reviewed_at": _now_iso(),
                "security_notes": request.security_notes,
            })
            .eq("campus_id", campus_id)
            .eq("id", application_id)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": updated.dict() if updated else None}


def update_curfew_violations(
    campus_id: str,
    request: CurfewViolationUpdate,
    supabase: Any,
) -> Dict[str, Any]:
    updated = None
    profiles = list_student_profiles(campus_id)
    for index, profile in enumerate(profiles):
        if profile.user_id == request.user_id:
            updated = StudentRoomProfile(**{**profile.dict(), "curfew_violations": request.count})
            profiles[index] = updated
            break

    if not supabase:
        return {"status": "preview", "data": updated.dict() if updated else None}

    try:
        response = (
            supabase.table("campus_student_profiles")
            .update({"curfew_violations": request.count})
            .eq("campus_id", campus_id)
            .eq("user_id", request.user_id)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": updated.dict() if updated else None}


def get_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: Role = Role.STUDENT,
    designations: tuple[Designation, ...] = (),
) -> CampusLeaveWorkspace:
    profile = _profile_for(campus_id, user_id)
    can_see_all = (
        role == Role.ADMIN
        or _has_designation(designations, Designation.SECURITY)
        or _has_designation(designations, Designation.WARDEN)
    )
    can_see_directory = can_see_all
    return CampusLeaveWorkspace(
        config=get_config(campus_id=campus_id),
        profile=profile,
        applications=list_applications_for_student(campus_id, user_id),
        all_applications=list_applications(campus_id) if can_see_all else [],
        student_directory=list_student_profiles(campus_id) if can_see_directory else [],
        curfew_violations=profile.curfew_violations,
    )


def pending_application_count(campus_id: str = DEFAULT_CAMPUS_ID) -> int:
    return len([
        application for application in list_applications(campus_id)
        if application.status in {"submitted", "warden_approved"}
    ])


def active_leave_for_student(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> Optional[LeaveApplicationRecord]:
    today = date.today().isoformat()
    for application in list_applications_for_student(campus_id, user_id):
        if application.from_date <= today <= application.to_date:
            return application
    return None
