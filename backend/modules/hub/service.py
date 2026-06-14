from datetime import date
from typing import Dict, Tuple

from core.module_registry import discover_modules, module_summaries_for_role
from core.rbac import Designation, Role
from modules.menu.service import DEFAULT_CAMPUS_ID


def _planned_modules(
    role: Role,
    designations: Tuple[Designation, ...],
    connected_keys,
):
    modules = [
        {
            "key": "menu",
            "name": "Menu",
            "status": "connected",
            "summary": "Today meals, food committee updates, and student reviews.",
            "roles": ["student", "admin"],
            "designations": ["food_committee"],
        },
        {
            "key": "lms",
            "name": "LMS",
            "status": "planned",
            "summary": "Courses, assignments, materials, and TA workflows.",
            "roles": ["student", "professor", "admin"],
            "designations": ["teaching_assistant"],
        },
        {
            "key": "erp",
            "name": "ERP",
            "status": "planned",
            "summary": "Fee receipts, profile records, transport, and services.",
            "roles": ["student", "admin"],
            "designations": [],
        },
        {
            "key": "exam_lms",
            "name": "Exam LMS",
            "status": "planned",
            "summary": "Exam schedules, hall tickets, marks, and revaluation updates.",
            "roles": ["student", "professor", "admin"],
            "designations": [],
        },
        {
            "key": "campus_leave",
            "name": "Campus Leave",
            "status": "planned",
            "summary": "Leave requests, approvals, gate passes, and guardian alerts.",
            "roles": ["student", "admin"],
            "designations": [],
        },
    ]
    designation_values = {designation.value for designation in designations}
    return [
        {
            **module,
            "available": (
                role.value in module["roles"]
                or bool(designation_values.intersection(module["designations"]))
                or role == Role.ADMIN
            ),
        }
        for module in modules
        if module["key"] not in connected_keys
    ]


def build_hub_overview(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: Role = Role.STUDENT,
    designations: Tuple[Designation, ...] = (),
) -> Dict:
    today = date.today().isoformat()
    connected_modules = discover_modules()
    connected_keys = {module.key for module in connected_modules}
    module_data = {}
    extra_hub_data = {}
    module_notifications = []
    module_updates = []
    module_calendar = []

    for module in connected_modules:
        if module.hub_provider:
            contribution = module.hub_provider(
                campus_id,
                user_id,
                role,
                today,
                designations,
            )
            for key, value in contribution.items():
                if key == "module_data" and isinstance(value, dict):
                    module_data.update(value)
                elif key == "notifications" and isinstance(value, list):
                    module_notifications.extend(value)
                elif key == "updates" and isinstance(value, list):
                    module_updates.extend(value)
                elif key == "calendar" and isinstance(value, list):
                    module_calendar.extend(value)
                else:
                    extra_hub_data[key] = value

    return {
        "campus_id": campus_id,
        "user_id": user_id,
        "role": role.value,
        "designations": [designation.value for designation in designations],
        "date": today,
        "notifications": [
            {
                "id": "notice-menu-1",
                "module_key": "menu",
                "title": "Weekly menu is available",
                "body": "The food committee has published the default menu app schedule.",
                "priority": "high",
            },
            {
                "id": "notice-calendar-1",
                "module_key": "hub",
                "title": "Calendar sync pending",
                "body": "LMS, ERP, Exam LMS, and Leave modules can plug their events into this hub feed.",
                "priority": "normal",
            },
        ] + module_notifications,
        "updates": [
            {
                "module_key": "menu",
                "title": "Menu module connected",
                "body": "Students can view meals, rate items, request sick meals, and send feedback.",
            },
            {
                "module_key": "rbac",
                "title": "Roles and designations ready",
                "body": "Food Committee and TA access are student designations, not separate global roles.",
            },
        ] + module_updates,
        "calendar": [
            {
                "time": "09:00",
                "title": "Daily campus briefing",
                "module_key": "hub",
            },
            {
                "time": "12:30",
                "title": "Lunch window",
                "module_key": "menu",
            },
            {
                "time": "17:00",
                "title": "Module update checkpoint",
                "module_key": "hub",
            },
        ] + module_calendar,
        "modules": (
            module_summaries_for_role(role, designations)
            + _planned_modules(role, designations, connected_keys)
        ),
        **extra_hub_data,
        **({"module_data": module_data} if module_data else {}),
    }
