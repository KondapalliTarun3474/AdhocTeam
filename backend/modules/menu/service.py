import json
from datetime import date
from typing import Any, Dict, List, Optional

from database import get_supabase
from modules.menu.fetcher import fetch_default_menu
from modules.menu.schemas import MealSchema, MenuDaySchema, MenuReviewRequest


DEFAULT_CAMPUS_ID = "00000000-0000-0000-0000-000000000000"


def _normalize_items(items: Any) -> List[str]:
    if isinstance(items, list):
        return [str(item) for item in items]
    if isinstance(items, str):
        try:
            parsed = json.loads(items)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except json.JSONDecodeError:
            return [items]
    return []


def parse_menu(raw_json: Dict[str, Any], campus_id: str, target_date: str) -> MenuDaySchema:
    meals = []
    for meal_type, items in raw_json.items():
        meals.append(MealSchema(meal_type=meal_type, items=_normalize_items(items)))
    return MenuDaySchema(campus_id=campus_id, date=target_date, meals=meals)


def _fallback_menu(campus_id: str, target_date: str) -> MenuDaySchema:
    return parse_menu(fetch_default_menu(), campus_id, target_date)


def get_menu_for_date(
    campus_id: str = DEFAULT_CAMPUS_ID,
    target_date: Optional[str] = None,
    supabase: Any = None,
) -> MenuDaySchema:
    selected_date = target_date or date.today().isoformat()
    db = supabase or get_supabase()

    if db:
        try:
            response = (
                db.table("meals")
                .select("meal_type, items")
                .eq("campus_id", campus_id)
                .eq("date", selected_date)
                .execute()
            )
            if response.data:
                meals = [
                    MealSchema(
                        meal_type=row["meal_type"],
                        items=_normalize_items(row.get("items", [])),
                    )
                    for row in response.data
                ]
                return MenuDaySchema(
                    campus_id=campus_id,
                    date=selected_date,
                    meals=meals,
                )
        except Exception:
            pass

    return _fallback_menu(campus_id, selected_date)


def sync_menu(config: Dict[str, Any], supabase: Any) -> bool:
    if not supabase:
        raise ValueError("Supabase is not configured.")

    campus_id = config.get("campus_id") or DEFAULT_CAMPUS_ID
    source_url = config.get("source_url")
    target_date = config.get("date") or date.today().isoformat()
    parsed_menu = parse_menu(fetch_default_menu(source_url), campus_id, target_date)

    success_count = 0
    for meal in parsed_menu.meals:
        row = {
            "campus_id": campus_id,
            "date": parsed_menu.date,
            "meal_type": meal.meal_type,
            "items": meal.items,
            "source": "menu.default_json",
            "raw_payload": json.dumps(fetch_default_menu(source_url)),
        }
        response = (
            supabase.table("meals")
            .upsert(row, on_conflict="campus_id,date,meal_type")
            .execute()
        )
        if response.data:
            success_count += 1

    return success_count == len(parsed_menu.meals)


def upsert_menu(menu: MenuDaySchema, supabase: Any) -> MenuDaySchema:
    if not supabase:
        return menu

    for meal in menu.meals:
        supabase.table("meals").upsert(
            {
                "campus_id": menu.campus_id,
                "date": menu.date,
                "meal_type": meal.meal_type,
                "items": meal.items,
                "source": "menu.manual_update",
                "raw_payload": json.dumps(meal.dict()),
            },
            on_conflict="campus_id,date,meal_type",
        ).execute()

    return menu


def save_review(review: MenuReviewRequest, supabase: Any) -> Dict[str, Any]:
    row = review.dict()
    if not supabase:
        return {"status": "preview", "data": row}

    response = (
        supabase.table("menu_reviews")
        .upsert(row, on_conflict="campus_id,date,meal_type,user_id,dish_name")
        .execute()
    )
    return {"status": "success", "data": response.data}


def format_menu_for_assistant(campus_id: str, target_date: Optional[str] = None) -> str:
    menu = get_menu_for_date(campus_id=campus_id, target_date=target_date)
    lines = [f"Menu for {menu.date}:"]
    for meal in menu.meals:
        lines.append(f"{meal.meal_type.title()}: {', '.join(meal.items)}")
    return "\n".join(lines)
