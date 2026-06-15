from typing import Optional

from fastapi import APIRouter, Depends

from core.rbac import Role, require_permission
from database import get_supabase
from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.announcements.schemas import AnnouncementCreateRequest
from modules.announcements.service import create_announcement, get_workspace


router = APIRouter(prefix="/api/modules/announcements", tags=["announcements"])


@router.get("/workspace")
def read_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    course_id: Optional[str] = None,
    _: Role = Depends(require_permission("announcements:view")),
):
    return get_workspace(campus_id, category, tag, course_id)


@router.post("")
def add_announcement(
    request: AnnouncementCreateRequest,
    _: Role = Depends(require_permission("announcements:create")),
):
    return create_announcement(request, get_supabase())
