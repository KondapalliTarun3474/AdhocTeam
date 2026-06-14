from typing import Any, Dict

from core.module_registry import CampusModule
from core.rbac import Role
from modules.menu.router import router
from modules.menu.service import get_menu_for_date


def menu_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
) -> Dict[str, Any]:
    return {
        "menu": get_menu_for_date(campus_id=campus_id, target_date=today).dict(),
    }


MODULE = CampusModule(
    key="menu",
    name="Menu",
    status="connected",
    summary="Today meals, food committee updates, and student reviews.",
    roles=(Role.STUDENT, Role.FOOD_COMMITTEE, Role.ADMIN),
    router=router,
    hub_provider=menu_hub_provider,
)
