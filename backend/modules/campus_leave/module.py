from typing import Any, Dict, Tuple

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.campus_leave.router import router
from modules.campus_leave.service import (
    active_leave_for_student,
    get_workspace,
    pending_application_count,
)


def leave_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: Tuple[Designation, ...],
) -> Dict[str, Any]:
    workspace = get_workspace(
        campus_id=campus_id,
        user_id=user_id,
        role=role,
        designations=designations,
    )
    active_leave = active_leave_for_student(campus_id, user_id)
    pending_count = pending_application_count(campus_id)
    notifications = []

    if workspace.curfew_violations:
        notifications.append({
            "id": "leave-curfew",
            "module_key": "campus_leave",
            "title": "Curfew violations on record",
            "body": f"{workspace.curfew_violations} curfew violation(s) are attached to this student profile.",
            "priority": "normal",
        })

    if Designation.SECURITY in designations and pending_count:
        notifications.append({
            "id": "leave-security-pending",
            "module_key": "campus_leave",
            "title": "Leave gate-pass queue",
            "body": f"{pending_count} leave application(s) need security visibility.",
            "priority": "high",
        })

    return {
        "notifications": notifications,
        "updates": [
            {
                "module_key": "campus_leave",
                "title": "Leave module connected",
                "body": "Students can request leave while Security and Wardens get dedicated views.",
            }
        ],
        "module_data": {
            "campus_leave": {
                "active_leave": active_leave.dict() if active_leave else None,
                "latest_application": workspace.applications[0].dict() if workspace.applications else None,
                "pending_count": pending_count,
                "curfew_violations": workspace.curfew_violations,
            }
        },
    }


from modules.campus_leave.tools import LEAVE_TOOLS

MODULE = CampusModule(
    key="campus_leave",
    name="Leave Application",
    status="connected",
    summary="Leave requests, guardian contacts, curfew records, security, and warden views.",
    roles=(Role.STUDENT, Role.STAFF, Role.ADMIN),
    designations=(Designation.SECURITY, Designation.WARDEN),
    router=router,
    hub_provider=leave_hub_provider,
    agent_tools=LEAVE_TOOLS,
)
