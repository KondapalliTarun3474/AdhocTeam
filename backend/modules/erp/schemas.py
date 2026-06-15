from typing import List

from pydantic import BaseModel

from modules.academics.schemas import AcademicCourse, CourseConflict, CourseSession


class CourseRegistrationRecord(BaseModel):
    campus_id: str
    user_id: str
    course_id: str
    registered_at: str


class CourseRegistrationRequest(BaseModel):
    campus_id: str
    user_id: str
    course_id: str


class ErpWorkspace(BaseModel):
    campus_id: str
    user_id: str
    courses: List[AcademicCourse]
    registered_course_ids: List[str]
    registered_courses: List[AcademicCourse]
    registered_sessions: List[CourseSession]
    personal_calendar: dict
