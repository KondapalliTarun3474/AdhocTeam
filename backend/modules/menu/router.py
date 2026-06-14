from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from core.rbac import Role, require_permission
from database import get_supabase
from modules.menu.schemas import (
    MenuDaySchema,
    MenuReviewRequest,
    MenuSyncRequest,
    MenuUpdateRequest,
)
from modules.menu.service import (
    DEFAULT_CAMPUS_ID,
    get_menu_for_date,
    save_review,
    sync_menu,
    upsert_menu,
)


router = APIRouter(prefix="/api/modules/menu", tags=["menu"])


@router.get("")
def get_menu(
    campus_id: str = DEFAULT_CAMPUS_ID,
    date: Optional[str] = None,
    _: Role = Depends(require_permission("menu:view")),
):
    return get_menu_for_date(campus_id=campus_id, target_date=date)


@router.get("/today")
def get_today_menu(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:view")),
):
    return get_menu_for_date(campus_id=campus_id)


@router.post("/sync")
def trigger_menu_sync(
    request: MenuSyncRequest,
    _: Role = Depends(require_permission("menu:manage")),
):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    success = sync_menu(request.dict(), supabase)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to sync all menu rows")
    return {"status": "success", "message": "Synced menu successfully"}


@router.put("")
def update_menu(
    request: MenuUpdateRequest,
    _: Role = Depends(require_permission("menu:manage")),
):
    menu = MenuDaySchema(
        campus_id=request.campus_id,
        date=request.date,
        meals=request.meals,
    )
    saved = upsert_menu(menu, get_supabase())
    return {"status": "success", "data": saved}


@router.post("/reviews")
def create_menu_review(
    request: MenuReviewRequest,
    _: Role = Depends(require_permission("menu:review")),
):
    return save_review(request, get_supabase())
