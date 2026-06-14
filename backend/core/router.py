from pydantic import BaseModel
from fastapi import APIRouter, Depends

from database import get_supabase
from core.rbac import Role, require_permission, role_matrix


router = APIRouter(prefix="/api/rbac", tags=["rbac"])


class RoleAssignmentRequest(BaseModel):
    campus_id: str
    user_id: str
    role: Role
    module_key: str = "global"


@router.get("/permissions")
def get_permissions():
    return {"roles": role_matrix()}


@router.post("/roles")
def assign_role(
    request: RoleAssignmentRequest,
    _: Role = Depends(require_permission("roles:assign")),
):
    row = {
        "campus_id": request.campus_id,
        "user_id": request.user_id,
        "role": request.role.value,
        "module_key": request.module_key,
    }

    supabase = get_supabase()
    if not supabase:
        return {"status": "preview", "data": row}

    response = (
        supabase.table("user_roles")
        .upsert(row, on_conflict="campus_id,user_id,module_key,role")
        .execute()
    )
    return {"status": "success", "data": response.data}
