from typing import List, Optional

from pydantic import BaseModel

from modules.academics.schemas import AcademicCourse


class AssignmentRecord(BaseModel):
    id: str
    campus_id: str
    course_id: str
    course_code: str
    course_name: str
    title: str
    description: str
    deadline_at: str
    created_by: str


class AssignmentSubmissionRecord(BaseModel):
    id: str
    campus_id: str
    assignment_id: str
    course_id: str
    user_id: str
    filename: str
    content_type: str
    size_bytes: int
    submitted_at: str
    status: str = "submitted"


class LmsWorkspace(BaseModel):
    campus_id: str
    user_id: str
    courses: List[AcademicCourse]
    assignments: List[AssignmentRecord]
    submissions: List[AssignmentSubmissionRecord]


class AssignmentCreateRequest(BaseModel):
    campus_id: str
    course_id: str
    title: str
    description: str
    deadline_at: str
    created_by: Optional[str] = None
