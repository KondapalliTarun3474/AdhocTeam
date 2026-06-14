from fastapi import APIRouter, Depends

from core.rbac import Designation, Role, get_designations, require_permission
from database import get_supabase
from modules.campus_leave.schemas import (
    CurfewViolationUpdate,
    LeaveApplicationRequest,
    LeaveConfigUpdateRequest,
    LeaveStatusUpdate,
)
from modules.campus_leave.service import (
    DEFAULT_CAMPUS_ID,
    create_application,
    get_config,
    get_workspace,
    list_applications,
    list_student_profiles,
    save_config,
    update_application_status,
    update_curfew_violations,
)


router = APIRouter(prefix="/api/modules/campus-leave", tags=["campus-leave"])


@router.get("/workspace")
def read_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: Role = Depends(require_permission("campus_leave:view")),
    designations: set[Designation] = Depends(get_designations),
):
    return get_workspace(
        campus_id=campus_id,
        user_id=user_id,
        role=role,
        designations=tuple(designations),
    )


@router.get("/config")
def read_config(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("campus_leave:view")),
):
    return get_config(campus_id=campus_id)


@router.put("/config")
def update_config(
    request: LeaveConfigUpdateRequest,
    _: Role = Depends(require_permission("campus_leave:configure")),
):
    return save_config(request, get_supabase())


@router.get("/applications")
def read_applications(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("campus_leave:security")),
):
    return list_applications(campus_id)


@router.post("/applications")
def add_application(
    request: LeaveApplicationRequest,
    _: Role = Depends(require_permission("campus_leave:create")),
):
    return create_application(request, get_supabase())


@router.patch("/applications/{application_id}")
def patch_application(
    application_id: str,
    request: LeaveStatusUpdate,
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("campus_leave:manage")),
):
    return update_application_status(campus_id, application_id, request, get_supabase())


@router.get("/students")
def read_student_directory(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("students:rooms:view")),
):
    return list_student_profiles(campus_id)


@router.patch("/curfew")
def patch_curfew(
    request: CurfewViolationUpdate,
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("campus_leave:security")),
):
    return update_curfew_violations(campus_id, request, get_supabase())
