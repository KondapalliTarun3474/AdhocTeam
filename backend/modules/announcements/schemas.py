from typing import List, Optional

from pydantic import BaseModel


class AnnouncementRecord(BaseModel):
    id: str
    campus_id: str
    title: str
    body: str
    category: str
    tag: str
    course_id: Optional[str] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    created_by: str
    created_by_name: str
    audience: str = "students"
    priority: str = "normal"
    created_at: str


class AnnouncementCreateRequest(BaseModel):
    campus_id: str
    title: str
    body: str
    category: str
    tag: str
    created_by: str
    created_by_name: str
    audience: str = "students"
    course_id: Optional[str] = None
    priority: str = "normal"


class AnnouncementsWorkspace(BaseModel):
    campus_id: str
    announcements: List[AnnouncementRecord]
    categories: List[str]
    tags: List[str]
