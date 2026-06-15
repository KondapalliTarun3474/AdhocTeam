from fastapi import APIRouter, Depends, Header, Request

from core.rbac import Role, require_permission
from database import get_supabase
from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.lms.schemas import AssignmentCreateRequest
from modules.lms.service import create_assignment, get_workspace, save_submission


router = APIRouter(prefix="/api/modules/lms", tags=["lms"])


@router.get("/workspace")
def read_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: Role = Depends(require_permission("lms:view")),
):
    return get_workspace(
        campus_id=campus_id,
        user_id=user_id,
        include_all=role in {Role.PROFESSOR, Role.ADMIN},
    )


@router.post("/assignments")
def add_assignment(
    request: AssignmentCreateRequest,
    _: Role = Depends(require_permission("lms:manage")),
):
    return create_assignment(request, get_supabase())


@router.post("/submissions")
async def submit_assignment(
    request: Request,
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    assignment_id: str = Header(alias="X-Assignment-Id"),
    course_id: str = Header(alias="X-Course-Id"),
    filename: str = Header(default="submission.pdf", alias="X-Filename"),
    content_type: str = Header(default="application/pdf", alias="Content-Type"),
    _: Role = Depends(require_permission("lms:submit")),
):
    payload = await request.body()
    return save_submission(
        campus_id=campus_id,
        assignment_id=assignment_id,
        course_id=course_id,
        user_id=user_id,
        filename=filename,
        content_type=content_type,
        payload=payload,
        supabase=get_supabase(),
    )
