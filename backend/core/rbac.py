from enum import Enum
from typing import Dict, Iterable, Optional, Set, Union

from fastapi import Header, HTTPException, status


class Role(str, Enum):
    STUDENT = "student"
    PROFESSOR = "professor"
    STAFF = "staff"
    ADMIN = "admin"


class Designation(str, Enum):
    FOOD_COMMITTEE = "food_committee"
    TEACHING_ASSISTANT = "teaching_assistant"
    WARDEN = "warden"
    SECURITY = "security"
    CLASSROOM_SUPPORT = "classroom_support"


ROLE_PERMISSIONS: Dict[Role, Set[str]] = {
    Role.STUDENT: {
        "hub:view",
        "assistant:chat",
        "menu:view",
        "menu:review",
        "menu:sick_meal:create",
        "menu:feedback:create",
        "campus_rooms:view",
        "courses:view",
        "campus_leave:view",
        "campus_leave:create",
    },
    Role.PROFESSOR: {
        "hub:view",
        "assistant:chat",
        "campus_rooms:view",
        "courses:view",
    },
    Role.STAFF: {
        "hub:view",
        "assistant:chat",
    },
    Role.ADMIN: {
        "hub:view",
        "assistant:chat",
        "roles:assign",
        "designations:assign",
        "modules:configure",
        "menu:view",
        "menu:configure",
        "menu:manage",
        "menu:review",
        "menu:review:moderate",
        "menu:sick_meal:create",
        "menu:sick_meal:manage",
        "menu:feedback:create",
        "menu:feedback:moderate",
        "campus_rooms:view",
        "campus_rooms:configure",
        "campus_rooms:manage",
        "campus_rooms:block",
        "courses:view",
        "courses:manage",
        "campus_leave:view",
        "campus_leave:configure",
        "campus_leave:create",
        "campus_leave:manage",
        "campus_leave:security",
        "students:rooms:view",
    },
}


DESIGNATION_PERMISSIONS: Dict[Designation, Set[str]] = {
    Designation.FOOD_COMMITTEE: {
        "hub:view",
        "assistant:chat",
        "menu:view",
        "menu:manage",
        "menu:review:moderate",
        "menu:sick_meal:manage",
        "menu:feedback:moderate",
    },
    Designation.TEACHING_ASSISTANT: {
        "hub:view",
        "assistant:chat",
    },
    Designation.WARDEN: {
        "hub:view",
        "assistant:chat",
        "campus_rooms:view",
        "courses:view",
        "campus_leave:view",
        "campus_leave:manage",
        "students:rooms:view",
    },
    Designation.SECURITY: {
        "hub:view",
        "assistant:chat",
        "campus_rooms:view",
        "campus_leave:view",
        "campus_leave:manage",
        "campus_leave:security",
        "students:rooms:view",
    },
    Designation.CLASSROOM_SUPPORT: {
        "hub:view",
        "assistant:chat",
        "campus_rooms:view",
        "campus_rooms:manage",
        "campus_rooms:block",
        "courses:view",
    },
}


def normalize_role(value: str) -> Role:
    aliases = {
        "foodcommittee": Role.STUDENT,
        "food_committee": Role.STUDENT,
        "ta": Role.STUDENT,
        "teaching_assistant": Role.STUDENT,
        "security": Role.STAFF,
        "classroom_support": Role.STAFF,
        "classroom support": Role.STAFF,
        "warden": Role.PROFESSOR,
    }
    normalized = (value or Role.STUDENT.value).strip().lower()
    if normalized in aliases:
        return aliases[normalized]

    try:
        return Role(normalized)
    except ValueError:
        return Role.STUDENT


def normalize_designations(value: Optional[Union[str, Iterable[str]]]) -> Set[Designation]:
    aliases = {
        "foodcommittee": Designation.FOOD_COMMITTEE,
        "food_committee": Designation.FOOD_COMMITTEE,
        "food committee": Designation.FOOD_COMMITTEE,
        "ta": Designation.TEACHING_ASSISTANT,
        "teaching_assistant": Designation.TEACHING_ASSISTANT,
        "teaching assistant": Designation.TEACHING_ASSISTANT,
        "warden": Designation.WARDEN,
        "security": Designation.SECURITY,
        "classroom_support": Designation.CLASSROOM_SUPPORT,
        "classroom support": Designation.CLASSROOM_SUPPORT,
    }
    if value is None:
        return set()

    if isinstance(value, str):
        raw_values = value.split(",")
    else:
        raw_values = list(value)

    designations: Set[Designation] = set()
    for raw_value in raw_values:
        normalized = (raw_value or "").strip().lower()
        if not normalized:
            continue
        candidate = aliases.get(normalized)
        if candidate:
            designations.add(candidate)
            continue
        try:
            designations.add(Designation(normalized))
        except ValueError:
            continue
    return designations


def permissions_for(role: Role, designations: Iterable[Designation] = ()) -> Set[str]:
    permissions = set(ROLE_PERMISSIONS.get(role, set()))
    for designation in designations:
        permissions.update(DESIGNATION_PERMISSIONS.get(designation, set()))
    return permissions


def can(role: Role, permission: str, designations: Iterable[Designation] = ()) -> bool:
    return permission in permissions_for(role, designations)


def get_designations(
    x_user_designations: str = Header(default="", alias="X-User-Designations"),
) -> Set[Designation]:
    return normalize_designations(x_user_designations)


def require_permission(permission: str):
    def dependency(
        x_user_role: str = Header(default=Role.STUDENT.value, alias="X-User-Role"),
        x_user_designations: str = Header(default="", alias="X-User-Designations"),
    ) -> Role:
        role = normalize_role(x_user_role)
        designations = normalize_designations(x_user_designations)
        if not can(role, permission, designations):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access profile cannot perform '{permission}'.",
            )
        return role

    return dependency


def role_matrix():
    return {
        "roles": {
            role.value: sorted(permissions)
            for role, permissions in ROLE_PERMISSIONS.items()
        },
        "designations": {
            designation.value: sorted(permissions)
            for designation, permissions in DESIGNATION_PERMISSIONS.items()
        },
    }
