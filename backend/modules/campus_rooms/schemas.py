from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RoomModuleMode(str, Enum):
    EXTERNAL_WEBSITE = "external_website"
    DEFAULT_APP = "default_app"


class RoomBookingType(str, Enum):
    CLASS = "class"
    EVENT = "event"
    BLOCK = "block"


class RoomSetupConfig(BaseModel):
    campus_id: str
    module_key: str = "campus_rooms"
    mode: RoomModuleMode = RoomModuleMode.DEFAULT_APP
    source_url: Optional[str] = None
    is_active: bool = True
    last_synced_at: Optional[str] = None


class RoomConfigUpdateRequest(BaseModel):
    campus_id: str
    mode: RoomModuleMode
    source_url: Optional[str] = None
    is_active: bool = True


class CourseSchema(BaseModel):
    campus_id: str
    course_id: str
    course_code: str
    course_name: str
    term: str
    professor_id: str
    professor_name: str
    department: Optional[str] = None


class RoomSchema(BaseModel):
    campus_id: str
    room_id: str
    room_name: str
    building: str
    floor: str
    capacity: int = Field(ge=0)
    room_type: str


class RoomBookingRecord(BaseModel):
    id: str
    campus_id: str
    room_id: str
    room_name: str
    title: str
    booking_type: RoomBookingType = RoomBookingType.CLASS
    start_at: str
    end_at: str
    status: str = "confirmed"
    course_id: Optional[str] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    professor_id: Optional[str] = None
    professor_name: Optional[str] = None
    created_by: Optional[str] = None
    notes: Optional[str] = None


class RoomBookingCreateRequest(BaseModel):
    campus_id: str
    room_id: str
    title: str
    booking_type: RoomBookingType = RoomBookingType.CLASS
    start_at: str
    end_at: str
    course_id: Optional[str] = None
    professor_id: Optional[str] = None
    professor_name: Optional[str] = None
    created_by: Optional[str] = None
    notes: Optional[str] = None


class RoomBookingStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class CampusRoomsWorkspace(BaseModel):
    config: RoomSetupConfig
    rooms: List[RoomSchema]
    courses: List[CourseSchema]
    bookings: List[RoomBookingRecord]
    next_booking: Optional[RoomBookingRecord] = None
