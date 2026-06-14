from fastapi import APIRouter, Depends

from core.rbac import Role, require_permission
from modules.hub.service import build_hub_overview
from modules.menu.service import DEFAULT_CAMPUS_ID


router = APIRouter(prefix="/api/hub", tags=["hub"])


@router.get("/overview")
def get_overview(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: Role = Depends(require_permission("hub:view")),
):
    return build_hub_overview(campus_id=campus_id, user_id=user_id, role=role)
