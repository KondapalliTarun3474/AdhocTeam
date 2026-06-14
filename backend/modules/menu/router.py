from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from core.rbac import Role, require_permission
from database import get_supabase
from modules.menu.schemas import (
    MenuConfigUpdateRequest,
    MenuDaySchema,
    MenuFeedbackRequest,
    MenuFeedbackStatusUpdate,
    MenuRatingRequest,
    MenuReviewRequest,
    MenuSyncRequest,
    MenuTimingUpdateRequest,
    MenuUpdateRequest,
    SickMealRequest,
    SickMealStatusUpdate,
    WeeklyMenuSchema,
    WeeklyMenuUpdateRequest,
)
from modules.menu.service import (
    DEFAULT_CAMPUS_ID,
    get_config,
    get_menu_for_date,
    get_timings,
    get_weekly_menu,
    get_workspace,
    list_feedback,
    list_ratings,
    list_sick_meals,
    parse_weekly_menu_upload,
    save_config,
    save_feedback,
    save_rating,
    save_review,
    save_sick_meal,
    save_timings,
    sync_menu,
    summarize_ratings,
    update_feedback_status,
    update_sick_meal_status,
    upsert_menu,
    upsert_weekly_menu,
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


@router.get("/config")
def read_config(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:view")),
):
    return get_config(campus_id=campus_id)


@router.put("/config")
def update_config(
    request: MenuConfigUpdateRequest,
    _: Role = Depends(require_permission("menu:configure")),
):
    return save_config(request, get_supabase())


@router.get("/workspace")
def read_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    week_start: Optional[str] = None,
    _: Role = Depends(require_permission("menu:view")),
):
    return get_workspace(campus_id=campus_id, week_start=week_start)


@router.get("/timings")
def read_timings(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:view")),
):
    return get_timings(campus_id=campus_id)


@router.put("/timings")
def update_timings(
    request: MenuTimingUpdateRequest,
    _: Role = Depends(require_permission("menu:manage")),
):
    return save_timings(request, get_supabase())


@router.get("/week")
def read_weekly_menu(
    campus_id: str = DEFAULT_CAMPUS_ID,
    week_start: Optional[str] = None,
    _: Role = Depends(require_permission("menu:view")),
):
    return get_weekly_menu(campus_id=campus_id, week_start=week_start)


@router.put("/week")
def update_weekly_menu(
    request: WeeklyMenuUpdateRequest,
    _: Role = Depends(require_permission("menu:manage")),
):
    menu = WeeklyMenuSchema(
        campus_id=request.campus_id,
        week_start=request.week_start,
        days=request.days,
        imported_from=request.imported_from or "manual",
    )
    saved = upsert_weekly_menu(menu, get_supabase())
    return {"status": "success", "data": saved}


@router.post("/import")
async def import_weekly_menu(
    request: Request,
    campus_id: str = DEFAULT_CAMPUS_ID,
    week_start: Optional[str] = None,
    x_filename: str = Header(default="uploaded-menu.xlsx", alias="X-Filename"),
    _: Role = Depends(require_permission("menu:manage")),
):
    payload = await request.body()
    if not payload:
        raise HTTPException(status_code=400, detail="Upload payload is empty")

    try:
        menu = parse_weekly_menu_upload(
            payload=payload,
            campus_id=campus_id,
            filename=x_filename,
            requested_week_start=week_start,
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Could not parse menu upload: {error}")

    saved = upsert_weekly_menu(menu, get_supabase())
    return {"status": "success", "data": saved}


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


@router.get("/ratings")
def get_ratings(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:view")),
):
    return {
        "ratings": list_ratings(campus_id),
        "summary": summarize_ratings(campus_id),
    }


@router.post("/ratings")
def create_rating(
    request: MenuRatingRequest,
    _: Role = Depends(require_permission("menu:review")),
):
    return save_rating(request, get_supabase())


@router.get("/sick-meals")
def get_sick_meals(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:sick_meal:manage")),
):
    return list_sick_meals(campus_id)


@router.post("/sick-meals")
def create_sick_meal(
    request: SickMealRequest,
    _: Role = Depends(require_permission("menu:sick_meal:create")),
):
    return save_sick_meal(request, get_supabase())


@router.patch("/sick-meals/{record_id}")
def set_sick_meal_status(
    record_id: str,
    request: SickMealStatusUpdate,
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:sick_meal:manage")),
):
    return update_sick_meal_status(campus_id, record_id, request, get_supabase())


@router.get("/feedback")
def get_feedback(
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:feedback:moderate")),
):
    return list_feedback(campus_id)


@router.post("/feedback")
def create_feedback(
    request: MenuFeedbackRequest,
    _: Role = Depends(require_permission("menu:feedback:create")),
):
    return save_feedback(request, get_supabase())


@router.patch("/feedback/{record_id}")
def set_feedback_status(
    record_id: str,
    request: MenuFeedbackStatusUpdate,
    campus_id: str = DEFAULT_CAMPUS_ID,
    _: Role = Depends(require_permission("menu:feedback:moderate")),
):
    return update_feedback_status(campus_id, record_id, request, get_supabase())
