from typing import Any, Dict, Tuple

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.lms.router import router
from modules.lms.service import get_workspace
from modules.lms.tools import LMS_TOOLS


def lms_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: Tuple[Designation, ...],
) -> Dict[str, Any]:
    workspace = get_workspace(campus_id=campus_id, user_id=user_id)
    next_assignment = workspace.assignments[0] if workspace.assignments else None
    notifications = []
    if next_assignment:
        notifications.append({
            "id": f"lms-{next_assignment.id}",
            "module_key": "lms",
            "title": f"{next_assignment.course_code}: {next_assignment.title}",
            "body": f"Deadline: {next_assignment.deadline_at.replace('T', ' ')}",
            "priority": "normal",
        })
    return {
        "notifications": notifications,
        "module_data": {
            "lms": {
                "assignment_count": len(workspace.assignments),
                "next_assignment": next_assignment.dict() if next_assignment else None,
            }
        },
    }


MODULE = CampusModule(
    key="lms",
    name="LMS",
    status="connected",
    summary="Assignments, deadlines, and PDF submissions for registered courses.",
    roles=(Role.STUDENT, Role.PROFESSOR, Role.ADMIN),
    designations=(Designation.TEACHING_ASSISTANT,),
    router=router,
    hub_provider=lms_hub_provider,
    agent_tools=LMS_TOOLS,
)
