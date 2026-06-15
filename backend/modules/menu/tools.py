from typing import Optional
from langchain_core.tools import tool
from database import get_supabase
from modules.menu.service import get_menu_for_date, save_rating, DEFAULT_CAMPUS_ID
from modules.menu.schemas import MenuRatingRequest

@tool
def get_daily_menu(date: Optional[str] = None) -> str:
    """Get the campus food menu for a specific date (YYYY-MM-DD) or today if no date is provided.
    Returns the breakfast, lunch, snacks, and dinner items.
    """
    try:
        menu = get_menu_for_date(campus_id=DEFAULT_CAMPUS_ID, target_date=date)
        return menu.json()
    except Exception as e:
        return f"Error retrieving menu: {e}"

@tool
def submit_food_rating(
    user_id: str,
    date: str,
    day_name: str,
    meal_type: str,
    item_name: str,
    rating: int,
    comment: Optional[str] = None
) -> str:
    """Submit a star rating (1-5) and an optional comment for a specific food item.
    Requires user_id, date, day_name (e.g., 'Monday'), meal_type (e.g., 'lunch'), item_name, and rating.
    """
    try:
        req = MenuRatingRequest(
            campus_id=DEFAULT_CAMPUS_ID,
            user_id=user_id,
            date=date,
            day_name=day_name,
            meal_type=meal_type,
            item_name=item_name,
            rating=rating,
            comment=comment
        )
        res = save_rating(req, get_supabase())
        return str(res)
    except Exception as e:
        return f"Failed to submit rating: {e}"

MENU_TOOLS = [get_daily_menu, submit_food_rating]
