from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from core.rbac import Role, require_permission
from database import get_supabase
from modules.campus_rooms.schemas import (
    RoomBookingCreateRequest,
    RoomBookingStatusUpdate,
    RoomConfigUpdateRequest,
)
from modules.campus_rooms.service import (
    DEFAULT_CAMPUS_ID,
    create_booking,
    get_config,
    get_workspace,
    list_bookings,
    list_courses,
    list_rooms,
    save_config,
    update_booking_status,
)


router = APIRouter(prefix="/api/modules/campus-rooms", tags=["campus-rooms"])


@router.get("/workspace")
def read_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _: Role = Depends(require_permission("campus_rooms:view")),
):
    return get_workspace(campus_id=campus_id, start_date=start_date, end_date=end_date)


@router.get("/config")
def read_config(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("campus_rooms:view")),
):
    return get_config(campus_id=campus_id)


@router.put("/config")
def update_config(
    request: RoomConfigUpdateRequest,
    _: Role = Depends(require_permission("campus_rooms:configure")),
):
    return save_config(request, get_supabase())


@router.get("/rooms")
def read_rooms(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("campus_rooms:view")),
):
    return list_rooms(campus_id)


@router.get("/courses")
def read_courses(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("courses:view")),
):
    return list_courses(campus_id)


@router.get("/bookings")
def read_bookings(
    campus_id: str = DEFAULT_CAMPUS_ID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _: Role = Depends(require_permission("campus_rooms:view")),
):
    return list_bookings(campus_id, start_date, end_date)


@router.post("/bookings")
def add_booking(
    request: RoomBookingCreateRequest,
    _: Role = Depends(require_permission("campus_rooms:manage")),
):
    try:
        return create_booking(request, get_supabase())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.patch("/bookings/{booking_id}")
def patch_booking(
    booking_id: str,
    request: RoomBookingStatusUpdate,
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("campus_rooms:manage")),
):
    return update_booking_status(campus_id, booking_id, request, get_supabase())
