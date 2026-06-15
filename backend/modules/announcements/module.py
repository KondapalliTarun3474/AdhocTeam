from typing import Any, Dict, Tuple

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.announcements.router import router
from modules.announcements.service import get_workspace
from modules.announcements.tools import ANNOUNCEMENT_TOOLS


def announcements_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: Tuple[Designation, ...],
) -> Dict[str, Any]:
    workspace = get_workspace(campus_id)
    top = workspace.announcements[:3]
    return {
        "notifications": [
            {
                "id": f"announcement-{item.id}",
                "module_key": "announcements",
                "title": item.title,
                "body": item.body,
                "priority": item.priority,
            }
            for item in top
        ],
        "module_data": {
            "announcements": {
                "unread_count": len(workspace.announcements),
                "latest": top[0].dict() if top else None,
            }
        },
    }


MODULE = CampusModule(
    key="announcements",
    name="Announcements",
    status="connected",
    summary="Inbox for course notices, quizzes, results, opportunities, events, and resources.",
    roles=(Role.STUDENT, Role.PROFESSOR, Role.STAFF, Role.ADMIN),
    designations=(Designation.TEACHING_ASSISTANT,),
    router=router,
    hub_provider=announcements_hub_provider,
    agent_tools=ANNOUNCEMENT_TOOLS,
)
