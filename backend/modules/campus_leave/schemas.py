from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class LeaveModuleMode(str, Enum):
    EXTERNAL_WEBSITE = "external_website"
    DEFAULT_APP = "default_app"


class LeaveSetupConfig(BaseModel):
    campus_id: str
    module_key: str = "campus_leave"
    mode: LeaveModuleMode = LeaveModuleMode.DEFAULT_APP
    source_url: Optional[str] = None
    is_active: bool = True
    last_synced_at: Optional[str] = None


class LeaveConfigUpdateRequest(BaseModel):
    campus_id: str
    mode: LeaveModuleMode
    source_url: Optional[str] = None
    is_active: bool = True


class StudentRoomProfile(BaseModel):
    campus_id: str
    user_id: str
    student_name: str
    email: str
    phone: str
    program: str
    batch: str
    hostel: str
    room_number: str
    guardian_name: str
    guardian_relation: str
    guardian_email: str
    guardian_phone: str
    curfew_violations: int = 0


class LeaveApplicationRequest(BaseModel):
    campus_id: str
    user_id: str
    student_name: str
    from_date: str
    to_date: str
    departure_time: str
    return_time: str
    leave_type: str
    destination: str
    reason: str
    guardian_relation: str
    guardian_email: str
    guardian_phone: str
    emergency_contact: str


class LeaveApplicationRecord(LeaveApplicationRequest):
    id: str
    status: str = "submitted"
    submitted_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    security_notes: Optional[str] = None


class LeaveStatusUpdate(BaseModel):
    status: str
    reviewed_by: Optional[str] = None
    security_notes: Optional[str] = None


class CurfewViolationUpdate(BaseModel):
    user_id: str
    count: int


class CampusLeaveWorkspace(BaseModel):
    config: LeaveSetupConfig
    profile: StudentRoomProfile
    applications: List[LeaveApplicationRecord]
    all_applications: List[LeaveApplicationRecord]
    student_directory: List[StudentRoomProfile]
    curfew_violations: int
