from typing import Any, Dict, Tuple

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.menu.router import router
from modules.menu.service import get_menu_for_date


from modules.menu.tools import MENU_TOOLS


def menu_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: Tuple[Designation, ...],
) -> Dict[str, Any]:
    return {
        "menu": get_menu_for_date(campus_id=campus_id, target_date=today).dict(),
    }


MODULE = CampusModule(
    key="menu",
    name="Foode",
    status="connected",
    summary="Daily and weekly campus menus, ratings, sick meals, and feedback.",
    roles=(Role.STUDENT, Role.STAFF, Role.ADMIN),
    router=router,
    hub_provider=menu_hub_provider,
    agent_tools=MENU_TOOLS,
)
