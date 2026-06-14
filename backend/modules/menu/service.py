import csv
import json
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from database import get_supabase
from modules.menu.fetcher import fetch_default_menu
from modules.menu.schemas import (
    MealSchema,
    MenuConfigUpdateRequest,
    MenuDaySchema,
    MenuFeedbackRecord,
    MenuFeedbackRequest,
    MenuFeedbackStatusUpdate,
    MenuModuleMode,
    MenuRatingRequest,
    MenuRatingSummary,
    MenuReminder,
    MenuReviewRequest,
    MenuSetupConfig,
    MenuTimingSchema,
    MenuTimingUpdateRequest,
    MenuWeekDaySchema,
    MenuWorkspaceSchema,
    SickMealRecord,
    SickMealRequest,
    SickMealStatusUpdate,
    WeeklyMenuSchema,
)


DEFAULT_CAMPUS_ID = "00000000-0000-0000-0000-000000000000"
DEFAULT_WEEKLY_MENU_FILE = Path(__file__).with_name("default_weekly_menu.json")
MEAL_TYPES = ("breakfast", "lunch", "snacks", "dinner")
DEFAULT_MEAL_TIMINGS = [
    {
        "meal_type": "breakfast",
        "label": "Breakfast",
        "start_label": "7:30 AM",
        "end_label": "9:45 AM",
        "start_minute": 7 * 60 + 30,
        "end_minute": 9 * 60 + 45,
    },
    {
        "meal_type": "lunch",
        "label": "Lunch",
        "start_label": "12:30 PM",
        "end_label": "2:00 PM",
        "start_minute": 12 * 60 + 30,
        "end_minute": 14 * 60,
    },
    {
        "meal_type": "snacks",
        "label": "Snacks",
        "start_label": "4:30 PM",
        "end_label": "5:45 PM",
        "start_minute": 16 * 60 + 30,
        "end_minute": 17 * 60 + 45,
    },
    {
        "meal_type": "dinner",
        "label": "Dinner",
        "start_label": "7:30 PM",
        "end_label": "9:30 PM",
        "start_minute": 19 * 60 + 30,
        "end_minute": 21 * 60 + 30,
    },
]
DAY_NAMES = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)

_CONFIGS: Dict[str, MenuSetupConfig] = {}
_CONFIG_JSON: Dict[str, Dict[str, Any]] = {}
_TIMINGS: Dict[str, List[MenuTimingSchema]] = {}
_WEEKLY_MENUS: Dict[str, WeeklyMenuSchema] = {}
_RATINGS: List[MenuRatingRequest] = []
_SICK_MEALS: List[SickMealRecord] = []
_FEEDBACK: List[MenuFeedbackRecord] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_text(value: Any) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\xa0", " ").strip()
    return re.sub(r"\s+", " ", text)


def _normalize_items(items: Any) -> List[str]:
    if isinstance(items, list):
        return [_clean_text(item) for item in items if _clean_text(item)]
    if isinstance(items, str):
        try:
            parsed = json.loads(items)
            if isinstance(parsed, list):
                return [_clean_text(item) for item in parsed if _clean_text(item)]
        except json.JSONDecodeError:
            return [_clean_text(items)] if _clean_text(items) else []
    return []


def _parse_date(value: Optional[str]) -> date:
    if not value:
        return date.today()
    return date.fromisoformat(value)


def _week_start_for(value: Optional[str] = None) -> date:
    selected_date = _parse_date(value)
    return selected_date - timedelta(days=selected_date.weekday())


def _default_config(campus_id: str) -> MenuSetupConfig:
    return MenuSetupConfig(
        campus_id=campus_id,
        mode=MenuModuleMode.DEFAULT_APP,
        source_url="https://foodcommittee.iiitb.ac.in",
        is_active=True,
    )


def _default_timings() -> List[MenuTimingSchema]:
    return [MenuTimingSchema(**timing) for timing in DEFAULT_MEAL_TIMINGS]


def _normalize_config_json(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _get_config_json(campus_id: str, supabase: Any = None) -> Dict[str, Any]:
    db = supabase or get_supabase()
    if db:
        try:
            response = (
                db.table("module_configs")
                .select("config_json")
                .eq("campus_id", campus_id)
                .eq("module_key", "menu")
                .execute()
            )
            if response.data:
                return _normalize_config_json(response.data[0].get("config_json"))
        except Exception:
            pass
    return _CONFIG_JSON.get(campus_id, {})


def _weekly_key(campus_id: str, week_start: str) -> str:
    return f"{campus_id}:{week_start}"


def _load_seed_weekly_menu(campus_id: str, week_start: Optional[str] = None) -> WeeklyMenuSchema:
    with DEFAULT_WEEKLY_MENU_FILE.open("r", encoding="utf-8") as file:
        raw = json.load(file)
    requested_start = _week_start_for(week_start).isoformat()
    source_start = date.fromisoformat(raw["week_start"])
    target_start = date.fromisoformat(requested_start)
    days: List[MenuWeekDaySchema] = []

    for index, raw_day in enumerate(raw["days"]):
        target_date = target_start + timedelta(days=index)
        source_date = date.fromisoformat(raw_day["date"])
        offset = (source_date - source_start).days
        day_name = DAY_NAMES[offset] if 0 <= offset < len(DAY_NAMES) else target_date.strftime("%A")
        days.append(
            MenuWeekDaySchema(
                date=target_date.isoformat(),
                day_name=day_name,
                meals=[
                    MealSchema(
                        meal_type=meal["meal_type"],
                        items=_normalize_items(meal.get("items", [])),
                    )
                    for meal in raw_day.get("meals", [])
                ],
            )
        )

    return WeeklyMenuSchema(
        campus_id=campus_id,
        week_start=requested_start,
        days=days,
        imported_from=f"{raw.get('imported_from', 'default_weekly_menu.json')} seed",
        last_updated_at=_now_iso(),
    )


def parse_menu(raw_json: Dict[str, Any], campus_id: str, target_date: str) -> MenuDaySchema:
    meals = []
    for meal_type, items in raw_json.items():
        meals.append(MealSchema(meal_type=meal_type, items=_normalize_items(items)))
    return MenuDaySchema(campus_id=campus_id, date=target_date, meals=meals)


def _fallback_menu(campus_id: str, target_date: str) -> MenuDaySchema:
    target = _parse_date(target_date)
    weekly_menu = _load_seed_weekly_menu(
        campus_id=campus_id,
        week_start=_week_start_for(target_date).isoformat(),
    )
    for day in weekly_menu.days:
        if day.date == target.isoformat():
            return MenuDaySchema(
                campus_id=campus_id,
                date=target_date,
                meals=day.meals,
            )
    return parse_menu(fetch_default_menu(), campus_id, target_date)


def get_config(campus_id: str = DEFAULT_CAMPUS_ID, supabase: Any = None) -> MenuSetupConfig:
    db = supabase or get_supabase()
    if db:
        try:
            response = (
                db.table("module_configs")
                .select("campus_id,module_key,module_mode,source_url,is_active,last_synced_at,config_json")
                .eq("campus_id", campus_id)
                .eq("module_key", "menu")
                .execute()
            )
            if response.data:
                row = response.data[0]
                _CONFIG_JSON[campus_id] = _normalize_config_json(row.get("config_json"))
                return MenuSetupConfig(
                    campus_id=row["campus_id"],
                    module_key=row.get("module_key", "menu"),
                    mode=row.get("module_mode") or MenuModuleMode.DEFAULT_APP,
                    source_url=row.get("source_url"),
                    is_active=row.get("is_active", True),
                    last_synced_at=row.get("last_synced_at"),
                )
        except Exception:
            pass

    return _CONFIGS.get(campus_id, _default_config(campus_id))


def save_config(request: MenuConfigUpdateRequest, supabase: Any) -> Dict[str, Any]:
    config = MenuSetupConfig(
        campus_id=request.campus_id,
        mode=request.mode,
        source_url=request.source_url,
        is_active=request.is_active,
    )
    _CONFIGS[request.campus_id] = config
    config_json = _get_config_json(request.campus_id, supabase)
    _CONFIG_JSON[request.campus_id] = config_json

    if not supabase:
        return {"status": "preview", "data": config.dict()}

    row = {
        "campus_id": config.campus_id,
        "module_key": "menu",
        "module_mode": config.mode.value,
        "source_url": config.source_url,
        "is_active": config.is_active,
        "config_json": config_json,
    }
    response = (
        supabase.table("module_configs")
        .upsert(row, on_conflict="campus_id,module_key")
        .execute()
    )
    return {"status": "success", "data": response.data}


def get_timings(
    campus_id: str = DEFAULT_CAMPUS_ID,
    supabase: Any = None,
) -> List[MenuTimingSchema]:
    if campus_id in _TIMINGS:
        return _TIMINGS[campus_id]

    config_json = _get_config_json(campus_id, supabase)
    raw_timings = config_json.get("meal_timings")
    if isinstance(raw_timings, list):
        try:
            timings = [MenuTimingSchema(**timing) for timing in raw_timings]
            _TIMINGS[campus_id] = timings
            return timings
        except Exception:
            pass

    return _default_timings()


def save_timings(
    request: MenuTimingUpdateRequest,
    supabase: Any,
) -> Dict[str, Any]:
    timings = request.timings
    _TIMINGS[request.campus_id] = timings

    config_json = _get_config_json(request.campus_id, supabase)
    config_json["meal_timings"] = [timing.dict() for timing in timings]
    _CONFIG_JSON[request.campus_id] = config_json

    if not supabase:
        return {"status": "preview", "data": timings}

    config = get_config(campus_id=request.campus_id, supabase=supabase)
    row = {
        "campus_id": request.campus_id,
        "module_key": "menu",
        "module_mode": config.mode.value,
        "source_url": config.source_url,
        "is_active": config.is_active,
        "config_json": config_json,
    }
    (
        supabase.table("module_configs")
        .upsert(row, on_conflict="campus_id,module_key")
        .execute()
    )
    return {"status": "success", "data": timings}


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


def get_weekly_menu(
    campus_id: str = DEFAULT_CAMPUS_ID,
    week_start: Optional[str] = None,
    supabase: Any = None,
) -> WeeklyMenuSchema:
    selected_start = _week_start_for(week_start).isoformat()
    key = _weekly_key(campus_id, selected_start)
    if key in _WEEKLY_MENUS:
        return _WEEKLY_MENUS[key]

    db = supabase or get_supabase()
    if db:
        try:
            start_date = date.fromisoformat(selected_start)
            end_date = (start_date + timedelta(days=6)).isoformat()
            response = (
                db.table("meals")
                .select("date,meal_type,items")
                .eq("campus_id", campus_id)
                .gte("date", selected_start)
                .lte("date", end_date)
                .execute()
            )
            if response.data:
                by_date: Dict[str, List[MealSchema]] = {}
                for row in response.data:
                    row_date = str(row["date"])
                    by_date.setdefault(row_date, []).append(
                        MealSchema(
                            meal_type=row["meal_type"],
                            items=_normalize_items(row.get("items", [])),
                        )
                    )
                days = []
                for index, day_name in enumerate(DAY_NAMES):
                    current_date = (start_date + timedelta(days=index)).isoformat()
                    days.append(
                        MenuWeekDaySchema(
                            date=current_date,
                            day_name=day_name,
                            meals=by_date.get(current_date, []),
                        )
                    )
                return WeeklyMenuSchema(
                    campus_id=campus_id,
                    week_start=selected_start,
                    days=days,
                    imported_from="database",
                    last_updated_at=_now_iso(),
                )
        except Exception:
            pass

    return _load_seed_weekly_menu(campus_id=campus_id, week_start=selected_start)


def _save_weekly_rows(menu: WeeklyMenuSchema, supabase: Any, source: str) -> None:
    if not supabase:
        return
    for day in menu.days:
        for meal in day.meals:
            supabase.table("meals").upsert(
                {
                    "campus_id": menu.campus_id,
                    "date": day.date,
                    "meal_type": meal.meal_type,
                    "items": meal.items,
                    "source": source,
                    "raw_payload": json.dumps(meal.dict()),
                },
                on_conflict="campus_id,date,meal_type",
            ).execute()


def upsert_weekly_menu(menu: WeeklyMenuSchema, supabase: Any) -> WeeklyMenuSchema:
    menu.last_updated_at = _now_iso()
    _WEEKLY_MENUS[_weekly_key(menu.campus_id, menu.week_start)] = menu
    _save_weekly_rows(menu, supabase, "menu.weekly_update")
    return menu


def upsert_menu(menu: MenuDaySchema, supabase: Any) -> MenuDaySchema:
    if supabase:
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

    week = get_weekly_menu(
        campus_id=menu.campus_id,
        week_start=_week_start_for(menu.date).isoformat(),
        supabase=None,
    )
    updated_days = []
    for day in week.days:
        updated_days.append(
            MenuWeekDaySchema(
                date=day.date,
                day_name=day.day_name,
                meals=menu.meals if day.date == menu.date else day.meals,
            )
        )
    upsert_weekly_menu(
        WeeklyMenuSchema(
            campus_id=menu.campus_id,
            week_start=week.week_start,
            days=updated_days,
            imported_from=week.imported_from,
        ),
        supabase=None,
    )
    return menu


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


def _column_index(cell_ref: str) -> int:
    letters = "".join(character for character in cell_ref if character.isalpha())
    index = 0
    for character in letters:
        index = index * 26 + ord(character.upper()) - 64
    return index


def _excel_serial_to_date(value: str) -> date:
    return date(1899, 12, 30) + timedelta(days=int(float(value)))


def parse_weekly_menu_xlsx(
    payload: bytes,
    campus_id: str,
    filename: str = "uploaded-menu.xlsx",
    requested_week_start: Optional[str] = None,
) -> WeeklyMenuSchema:
    namespace = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with ZipFile(BytesIO(payload)) as workbook:
        shared_strings: List[str] = []
        shared_root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
        for item in shared_root.findall("m:si", namespace):
            shared_strings.append(
                _clean_text(
                    "".join(
                        text_node.text or ""
                        for text_node in item.findall(".//m:t", namespace)
                    )
                )
            )

        sheet_root = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))

    rows: Dict[int, Dict[int, str]] = {}
    for row in sheet_root.findall(".//m:sheetData/m:row", namespace):
        row_number = int(row.attrib["r"])
        rows[row_number] = {}
        for cell in row.findall("m:c", namespace):
            value_node = cell.find("m:v", namespace)
            value = ""
            if value_node is not None:
                raw_value = value_node.text or ""
                value = (
                    shared_strings[int(raw_value)]
                    if cell.attrib.get("t") == "s"
                    else raw_value
                )
            rows[row_number][_column_index(cell.attrib["r"])] = _clean_text(value)

    source_dates = [
        _excel_serial_to_date(rows.get(2, {}).get(index, "0"))
        for index in range(1, 8)
        if rows.get(2, {}).get(index)
    ]
    week_start = (
        _week_start_for(requested_week_start)
        if requested_week_start
        else (source_dates[0] if source_dates else _week_start_for())
    )

    day_names = [
        rows.get(1, {}).get(index, DAY_NAMES[index - 1]).title()
        for index in range(1, 8)
    ]
    days = [
        MenuWeekDaySchema(
            date=(week_start + timedelta(days=index)).isoformat(),
            day_name=day_name,
            meals=[],
        )
        for index, day_name in enumerate(day_names)
    ]

    current_meal: Optional[str] = None
    meal_sections = {meal_type.upper() for meal_type in MEAL_TYPES}

    for row_number in range(4, 244):
        row_values = [rows.get(row_number, {}).get(index, "") for index in range(1, 8)]
        section = next(
            (value.lower() for value in row_values if value.upper() in meal_sections),
            None,
        )
        if section:
            current_meal = section
            for day in days:
                day.meals.append(MealSchema(meal_type=current_meal, items=[]))
            continue

        if not current_meal:
            continue

        for day_index, day in enumerate(days, start=1):
            item = rows.get(row_number, {}).get(day_index, "")
            if item and day.meals:
                day.meals[-1].items.append(item)

    for day in days:
        day.meals = [
            MealSchema(meal_type=meal.meal_type, items=_normalize_items(meal.items))
            for meal in day.meals
            if meal.items
        ]

    return WeeklyMenuSchema(
        campus_id=campus_id,
        week_start=week_start.isoformat(),
        days=days,
        imported_from=filename,
        last_updated_at=_now_iso(),
    )


def parse_weekly_menu_csv(
    payload: bytes,
    campus_id: str,
    filename: str = "uploaded-menu.csv",
    requested_week_start: Optional[str] = None,
) -> WeeklyMenuSchema:
    text = payload.decode("utf-8-sig")
    reader = csv.DictReader(StringIO(text))
    required_columns = {
        "week_start",
        "date",
        "day_name",
        "meal_type",
        "item_order",
        "item_name",
    }
    missing_columns = required_columns.difference(reader.fieldnames or [])
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"CSV missing required columns: {missing}")

    rows = [
        {key: _clean_text(value) for key, value in row.items()}
        for row in reader
        if _clean_text(row.get("item_name"))
    ]
    if not rows:
        raise ValueError("CSV does not contain any menu item rows")

    first_week_start = rows[0].get("week_start") or requested_week_start
    week_start = _week_start_for(first_week_start).isoformat()
    start_date = date.fromisoformat(week_start)
    by_day: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}

    for row in rows:
        item_date = row.get("date")
        if not item_date:
            day_name = row.get("day_name", "").strip().lower()
            try:
                day_index = [name.lower() for name in DAY_NAMES].index(day_name)
            except ValueError:
                raise ValueError(f"Invalid day_name '{row.get('day_name')}'")
            item_date = (start_date + timedelta(days=day_index)).isoformat()

        meal_type = row.get("meal_type", "").strip().lower()
        if meal_type not in MEAL_TYPES:
            raise ValueError(f"Invalid meal_type '{row.get('meal_type')}'")

        order_value = row.get("item_order") or "0"
        try:
            order = int(float(order_value))
        except ValueError:
            order = 0

        by_day.setdefault(item_date, {}).setdefault(meal_type, []).append(
            {
                "order": order,
                "item_name": row["item_name"],
            }
        )

    days: List[MenuWeekDaySchema] = []
    for day_index, day_name in enumerate(DAY_NAMES):
        current_date = (start_date + timedelta(days=day_index)).isoformat()
        day_meals = []
        for meal_type in MEAL_TYPES:
            items = sorted(
                by_day.get(current_date, {}).get(meal_type, []),
                key=lambda item: item["order"],
            )
            if items:
                day_meals.append(
                    MealSchema(
                        meal_type=meal_type,
                        items=[item["item_name"] for item in items],
                    )
                )

        days.append(
            MenuWeekDaySchema(
                date=current_date,
                day_name=day_name,
                meals=day_meals,
            )
        )

    return WeeklyMenuSchema(
        campus_id=campus_id,
        week_start=week_start,
        days=days,
        imported_from=filename,
        last_updated_at=_now_iso(),
    )


def parse_weekly_menu_upload(
    payload: bytes,
    campus_id: str,
    filename: str,
    requested_week_start: Optional[str] = None,
) -> WeeklyMenuSchema:
    if filename.lower().endswith(".csv"):
        return parse_weekly_menu_csv(
            payload=payload,
            campus_id=campus_id,
            filename=filename,
            requested_week_start=requested_week_start,
        )

    return parse_weekly_menu_xlsx(
        payload=payload,
        campus_id=campus_id,
        filename=filename,
        requested_week_start=requested_week_start,
    )


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


def save_rating(rating: MenuRatingRequest, supabase: Any) -> Dict[str, Any]:
    _RATINGS.append(rating)
    row = rating.dict()
    if not supabase:
        return {"status": "preview", "data": row}

    try:
        response = (
            supabase.table("menu_item_ratings")
            .upsert(
                row,
                on_conflict="campus_id,user_id,date,meal_type,item_name",
            )
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": row}


def list_ratings(campus_id: str) -> List[MenuRatingRequest]:
    return [rating for rating in _RATINGS if rating.campus_id == campus_id]


def summarize_ratings(campus_id: str) -> List[MenuRatingSummary]:
    grouped: Dict[str, Dict[str, Any]] = {}
    for rating in list_ratings(campus_id):
        key = "|".join([
            rating.date,
            rating.day_name,
            rating.meal_type,
            rating.item_name,
        ])
        grouped.setdefault(
            key,
            {
                "date": rating.date,
                "day_name": rating.day_name,
                "meal_type": rating.meal_type,
                "item_name": rating.item_name,
                "total": 0,
                "count": 0,
            },
        )
        grouped[key]["total"] += rating.rating
        grouped[key]["count"] += 1

    return [
        MenuRatingSummary(
            date=value["date"],
            day_name=value["day_name"],
            meal_type=value["meal_type"],
            item_name=value["item_name"],
            average_rating=round(value["total"] / value["count"], 2),
            rating_count=value["count"],
        )
        for value in grouped.values()
    ]


def save_sick_meal(request: SickMealRequest, supabase: Any) -> Dict[str, Any]:
    record = SickMealRecord(
        **request.dict(),
        id=str(uuid.uuid4()),
        status="requested",
        created_at=_now_iso(),
    )
    _SICK_MEALS.append(record)
    if not supabase:
        return {"status": "preview", "data": record.dict()}

    try:
        response = supabase.table("menu_sick_meals").insert(record.dict()).execute()
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": record.dict()}


def list_sick_meals(campus_id: str) -> List[SickMealRecord]:
    return [record for record in _SICK_MEALS if record.campus_id == campus_id]


def update_sick_meal_status(
    campus_id: str,
    record_id: str,
    request: SickMealStatusUpdate,
    supabase: Any,
) -> Dict[str, Any]:
    for index, record in enumerate(_SICK_MEALS):
        if record.campus_id == campus_id and record.id == record_id:
            updated = SickMealRecord(**{**record.dict(), "status": request.status})
            _SICK_MEALS[index] = updated
            break
    else:
        updated = None

    if not supabase:
        return {"status": "preview", "data": updated.dict() if updated else None}

    try:
        response = (
            supabase.table("menu_sick_meals")
            .update({"status": request.status})
            .eq("campus_id", campus_id)
            .eq("id", record_id)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": updated.dict() if updated else None}


def save_feedback(request: MenuFeedbackRequest, supabase: Any) -> Dict[str, Any]:
    record = MenuFeedbackRecord(
        **request.dict(),
        id=str(uuid.uuid4()),
        status="open",
        created_at=_now_iso(),
    )
    _FEEDBACK.append(record)
    if not supabase:
        return {"status": "preview", "data": record.dict()}

    try:
        response = supabase.table("menu_feedback").insert(record.dict()).execute()
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": record.dict()}


def list_feedback(campus_id: str) -> List[MenuFeedbackRecord]:
    return [record for record in _FEEDBACK if record.campus_id == campus_id]


def update_feedback_status(
    campus_id: str,
    record_id: str,
    request: MenuFeedbackStatusUpdate,
    supabase: Any,
) -> Dict[str, Any]:
    for index, record in enumerate(_FEEDBACK):
        if record.campus_id == campus_id and record.id == record_id:
            updated = MenuFeedbackRecord(**{**record.dict(), "status": request.status})
            _FEEDBACK[index] = updated
            break
    else:
        updated = None

    if not supabase:
        return {"status": "preview", "data": updated.dict() if updated else None}

    try:
        response = (
            supabase.table("menu_feedback")
            .update({"status": request.status})
            .eq("campus_id", campus_id)
            .eq("id", record_id)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "preview", "data": updated.dict() if updated else None}


def get_menu_reminder(campus_id: str, weekly_menu: WeeklyMenuSchema) -> MenuReminder:
    today = date.today()
    is_deadline_window = today.weekday() in {5, 6, 0}
    is_seed_menu = "seed" in (weekly_menu.imported_from or "").lower()
    is_due = is_deadline_window and is_seed_menu
    return MenuReminder(
        is_due=is_due,
        title="Menu upload due",
        body=(
            "Food Committee students should publish this week's menu before Monday meals begin."
            if is_due
            else "This week's menu is available."
        ),
    )


def get_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    week_start: Optional[str] = None,
) -> MenuWorkspaceSchema:
    db = get_supabase()
    weekly_menu = get_weekly_menu(
        campus_id=campus_id,
        week_start=week_start,
        supabase=db,
    )
    return MenuWorkspaceSchema(
        config=get_config(campus_id=campus_id, supabase=db),
        weekly_menu=weekly_menu,
        ratings=list_ratings(campus_id),
        rating_summary=summarize_ratings(campus_id),
        sick_meals=list_sick_meals(campus_id),
        feedback=list_feedback(campus_id),
        meal_timings=get_timings(campus_id=campus_id, supabase=db),
        reminder=get_menu_reminder(campus_id, weekly_menu),
    )


def format_menu_for_assistant(campus_id: str, target_date: Optional[str] = None) -> str:
    menu = get_menu_for_date(campus_id=campus_id, target_date=target_date)
    lines = [f"Menu for {menu.date}:"]
    for meal in menu.meals:
        lines.append(f"{meal.meal_type.title()}: {', '.join(meal.items)}")
    return "\n".join(lines)
