from fastapi import APIRouter, Depends

from core.rbac import Role, require_permission
from modules.academics.service import DEFAULT_CAMPUS_ID
from modules.exam_lms.service import get_workspace


router = APIRouter(prefix="/api/modules/exam-lms", tags=["exam-lms"])


@router.get("/workspace")
def read_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: Role = Depends(require_permission("exam_lms:view")),
):
    return get_workspace(
        campus_id=campus_id,
        user_id=user_id,
        include_all=role in {Role.PROFESSOR, Role.ADMIN},
    )
