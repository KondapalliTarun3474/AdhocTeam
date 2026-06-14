from enum import Enum
from typing import Dict, Set

from fastapi import Header, HTTPException, status


class Role(str, Enum):
    STUDENT = "student"
    FOOD_COMMITTEE = "food_committee"
    PROFESSOR = "professor"
    TEACHING_ASSISTANT = "teaching_assistant"
    ADMIN = "admin"


ROLE_PERMISSIONS: Dict[Role, Set[str]] = {
    Role.STUDENT: {
        "hub:view",
        "assistant:chat",
        "menu:view",
        "menu:review",
    },
    Role.FOOD_COMMITTEE: {
        "hub:view",
        "assistant:chat",
        "menu:view",
        "menu:manage",
        "menu:review:moderate",
    },
    Role.PROFESSOR: {
        "hub:view",
        "assistant:chat",
    },
    Role.TEACHING_ASSISTANT: {
        "hub:view",
        "assistant:chat",
    },
    Role.ADMIN: {
        "hub:view",
        "assistant:chat",
        "roles:assign",
        "menu:view",
        "menu:manage",
        "menu:review",
        "menu:review:moderate",
    },
}


def normalize_role(value: str) -> Role:
    aliases = {
        "foodcommittee": Role.FOOD_COMMITTEE,
        "food_committee": Role.FOOD_COMMITTEE,
        "ta": Role.TEACHING_ASSISTANT,
        "teaching_assistant": Role.TEACHING_ASSISTANT,
    }
    normalized = (value or Role.STUDENT.value).strip().lower()
    if normalized in aliases:
        return aliases[normalized]

    try:
        return Role(normalized)
    except ValueError:
        return Role.STUDENT


def can(role: Role, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def require_permission(permission: str):
    def dependency(
        x_user_role: str = Header(default=Role.STUDENT.value, alias="X-User-Role"),
    ) -> Role:
        role = normalize_role(x_user_role)
        if not can(role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role.value}' cannot perform '{permission}'.",
            )
        return role

    return dependency


def role_matrix():
    return {
        role.value: sorted(permissions)
        for role, permissions in ROLE_PERMISSIONS.items()
    }
