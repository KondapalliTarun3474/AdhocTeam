from typing import Any, Dict, Tuple

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.erp.router import router
from modules.erp.service import get_workspace
from modules.erp.tools import ERP_TOOLS


def erp_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: Tuple[Designation, ...],
) -> Dict[str, Any]:
    workspace = get_workspace(campus_id=campus_id, user_id=user_id)
    calendar = [
        {
            "time": item["start_time"],
            "title": f"{item['label']} ({item['start_label']} - {item['end_label']})",
            "module_key": "erp",
        }
        for item in workspace.personal_calendar.get("items", [])
        if item.get("type") != "break"
    ]
    return {
        "calendar": calendar,
        "updates": [
            {
                "module_key": "erp",
                "title": "Course registration available",
                "body": "Students can register for electives and the ERP blocks timetable overlaps.",
            }
        ],
        "module_data": {
            "personal_calendar": workspace.personal_calendar,
            "erp": {
                "registered_count": len(workspace.registered_course_ids),
                "registered_courses": [course.dict() for course in workspace.registered_courses],
            },
        },
    }


MODULE = CampusModule(
    key="erp",
    name="ERP",
    status="connected",
    summary="Elective registration with timetable conflict checks and personal calendar.",
    roles=(Role.STUDENT, Role.PROFESSOR, Role.ADMIN),
    router=router,
    hub_provider=erp_hub_provider,
    agent_tools=ERP_TOOLS,
)
