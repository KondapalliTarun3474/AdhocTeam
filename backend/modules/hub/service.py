from datetime import date
from typing import Dict

from core.module_registry import discover_modules, module_summaries_for_role
from core.rbac import Role
from modules.menu.service import DEFAULT_CAMPUS_ID


def _planned_modules(role: Role, connected_keys):
    modules = [
        {
            "key": "menu",
            "name": "Menu",
            "status": "connected",
            "summary": "Today meals, food committee updates, and student reviews.",
            "roles": ["student", "food_committee", "admin"],
        },
        {
            "key": "lms",
            "name": "LMS",
            "status": "planned",
            "summary": "Courses, assignments, materials, and TA workflows.",
            "roles": ["student", "professor", "teaching_assistant", "admin"],
        },
        {
            "key": "erp",
            "name": "ERP",
            "status": "planned",
            "summary": "Fee receipts, profile records, transport, and services.",
            "roles": ["student", "admin"],
        },
        {
            "key": "exam_lms",
            "name": "Exam LMS",
            "status": "planned",
            "summary": "Exam schedules, hall tickets, marks, and revaluation updates.",
            "roles": ["student", "professor", "admin"],
        },
        {
            "key": "campus_leave",
            "name": "Campus Leave",
            "status": "planned",
            "summary": "Leave requests, approvals, gate passes, and guardian alerts.",
            "roles": ["student", "admin"],
        },
    ]
    return [
        {**module, "available": role.value in module["roles"] or role == Role.ADMIN}
        for module in modules
        if module["key"] not in connected_keys
    ]


def build_hub_overview(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: Role = Role.STUDENT,
) -> Dict:
    today = date.today().isoformat()
    connected_modules = discover_modules()
    connected_keys = {module.key for module in connected_modules}
    module_data = {}
    extra_hub_data = {}

    for module in connected_modules:
        if module.hub_provider:
            contribution = module.hub_provider(campus_id, user_id, role, today)
            for key, value in contribution.items():
                if key == "module_data" and isinstance(value, dict):
                    module_data.update(value)
                else:
                    extra_hub_data[key] = value

    return {
        "campus_id": campus_id,
        "user_id": user_id,
        "role": role.value,
        "date": today,
        "notifications": [
            {
                "id": "notice-menu-1",
                "module_key": "menu",
                "title": "Lunch menu is available",
                "body": "The food committee has published today's lunch and dinner menu.",
                "priority": "high",
            },
            {
                "id": "notice-calendar-1",
                "module_key": "hub",
                "title": "Calendar sync pending",
                "body": "LMS, ERP, Exam LMS, and Leave modules can plug their events into this hub feed.",
                "priority": "normal",
            },
        ],
        "updates": [
            {
                "module_key": "menu",
                "title": "Menu module connected",
                "body": "Students can view meals and review dishes. Food committee and admins can update menus.",
            },
            {
                "module_key": "rbac",
                "title": "Central RBAC scaffold ready",
                "body": "Modules can declare role-gated endpoints without editing the hub.",
            },
        ],
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
        ],
        "modules": module_summaries_for_role(role) + _planned_modules(role, connected_keys),
        **extra_hub_data,
        **({"module_data": module_data} if module_data else {}),
    }
