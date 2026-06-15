from typing import List, Optional

from pydantic import BaseModel


class AcademicCourse(BaseModel):
    campus_id: str
    course_id: str
    course_code: str
    course_name: str
    course_label: str
    department: str
    credits: int
    term: str
    professor_id: str
    professor_name: str
    instructors: List[str]
    room: str
    raw_timings: str


class AcademicRoom(BaseModel):
    campus_id: str
    room_id: str
    room_name: str
    building: str
    floor: str
    capacity: int
    room_type: str


class CourseSession(BaseModel):
    campus_id: str
    session_id: str
    course_id: str
    course_code: str
    course_name: str
    title: str
    department: str
    professor_id: str
    professor_name: str
    day: str
    day_index: int
    start_time: str
    end_time: str
    start_label: str
    end_label: str
    duration_minutes: int
    room_id: str
    room_name: str
    is_tutorial: bool = False
    session_type: str = "class"


class PersonalCalendarItem(BaseModel):
    id: str
    type: str
    label: str
    course_id: Optional[str] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    professor_name: Optional[str] = None
    room_name: Optional[str] = None
    start_time: str
    end_time: str
    start_label: str
    end_label: str
    color_key: str = "blue"


class CourseConflict(BaseModel):
    course_id: str
    course_code: str
    course_name: str
    conflicts_with: str
    day: str
    start_label: str
    end_label: str
