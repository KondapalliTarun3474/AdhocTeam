from typing import Any, Dict

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.campus_rooms.router import router
from modules.campus_rooms.service import format_calendar_item, get_workspace


def rooms_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: tuple[Designation, ...],
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


MODULE = CampusModule(
    key="campus_rooms",
    name="Campus Room Tracker",
    status="connected",
    summary="Room bookings, course-linked classes, and classroom support blocks.",
    roles=(Role.STUDENT, Role.PROFESSOR, Role.STAFF, Role.ADMIN),
    designations=(Designation.CLASSROOM_SUPPORT, Designation.WARDEN, Designation.SECURITY),
    router=router,
    hub_provider=rooms_hub_provider,
)
