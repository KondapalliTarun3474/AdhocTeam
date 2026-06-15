from typing import Any, Dict, Tuple

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.campus_rooms.router import router
from modules.campus_rooms.service import format_calendar_item, get_workspace


def rooms_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: Tuple[Designation, ...],
) -> Dict[str, Any]:
    workspace = get_workspace(campus_id=campus_id)
    calendar = [
        format_calendar_item(booking)
        for booking in workspace.bookings[:6]
    ]
    updates = [
        {
            "module_key": "campus_rooms",
            "title": "Room calendar connected",
            "body": "Classes, room blocks, and professor bookings can now appear in the hub.",
        }
    ]
    return {
        "calendar": calendar,
        "updates": updates,
        "module_data": {
            "campus_rooms": {
                "next_booking": workspace.next_booking.dict() if workspace.next_booking else None,
                "booking_count": len(workspace.bookings),
            }
        },
    }

from modules.campus_rooms.tools import ROOM_TOOLS

MODULE = CampusModule(
    key="campus_rooms",
    name="Campus Rooms",
    status="connected",
    summary="Classroom schedules, course associations, and maintenance booking.",
    roles=(Role.STUDENT, Role.STAFF, Role.ADMIN),
    router=router,
    hub_provider=rooms_hub_provider,
    agent_tools=ROOM_TOOLS,
)
