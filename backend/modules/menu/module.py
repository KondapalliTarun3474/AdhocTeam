from typing import Any, Dict

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.menu.router import router
from modules.menu.service import get_menu_for_date


def menu_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: tuple[Designation, ...],
) -> Dict[str, Any]:
    return {
        "menu": get_menu_for_date(campus_id=campus_id, target_date=today).dict(),
    }


MODULE = CampusModule(
    key="menu",
    name="Menu",
    status="connected",
    summary="Weekly meals, item ratings, sick meals, and feedback.",
    roles=(Role.STUDENT, Role.ADMIN),
    designations=(Designation.FOOD_COMMITTEE,),
    router=router,
    hub_provider=menu_hub_provider,
)
