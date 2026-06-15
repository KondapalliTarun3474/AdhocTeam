from fastapi import APIRouter, Depends

from core.rbac import Role, require_permission
from database import get_supabase
from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.erp.schemas import CourseRegistrationRequest
from modules.erp.service import drop_course, get_workspace, register_course


router = APIRouter(prefix="/api/modules/erp", tags=["erp"])


@router.get("/workspace")
def read_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    _: Role = Depends(require_permission("erp:view")),
):
    return get_workspace(campus_id=campus_id, user_id=user_id)


@router.post("/registrations")
def create_registration(
    request: CourseRegistrationRequest,
    _: Role = Depends(require_permission("erp:register")),
):
    return register_course(request, get_supabase())


@router.delete("/registrations/{course_id}")
def delete_registration(
    course_id: str,
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    _: Role = Depends(require_permission("erp:register")),
):
    return drop_course(campus_id, user_id, course_id, get_supabase())
