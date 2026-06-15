from typing import Optional
from langchain_core.tools import tool
from database import get_supabase
from modules.menu.service import get_menu_for_date, save_rating, get_user_food_ratings, DEFAULT_CAMPUS_ID
from modules.menu.schemas import MenuRatingRequest

@tool
def get_daily_menu(campus_id: str, date: Optional[str] = None) -> str:
    """Fetch the campus food menu for a specific date (YYYY-MM-DD), or today if no date is provided.
    Returns a list of food items served for breakfast, lunch, snacks, and dinner.
    Use this when the user asks what is for lunch or what is on the menu.
    You must call this tool before submitting any food ratings to find the exact correct spelling of a dish.
    """
    try:
        menu = get_menu_for_date(campus_id=campus_id, target_date=date)
        return menu.json()
    except Exception as e:
        return f"Error retrieving menu: {e}"

@tool
def get_past_food_ratings(user_id: str) -> str:
    """Get all past food ratings (1-5 stars) and comments submitted by this specific user.
    Returns a historical list of items the user has rated in the past.
    Use this when the user asks what they rated a dish, or when advising them on whether they should skip a meal by checking if they historically liked or disliked the items currently on today's menu.
    """
    try:
        ratings = get_user_food_ratings(user_id=user_id, campus_id=DEFAULT_CAMPUS_ID)
        import json
        return json.dumps(ratings)
    except Exception as e:
        return f"Error fetching past ratings: {e}"

@tool
def submit_food_rating(
    user_id: str,
    date: str,
    day_name: str,
    meal_type: str,
    item_name: str,
    rating: str,
    comment: Optional[str] = None
) -> str:
    """Submit a star rating (1-5) and an optional comment for a specific food item to the database.
    Creates or updates a rating record in the database.
    Use this ONLY when the user explicitly asks to rate a food item.
    You must ask the user for a 1-5 star rating before calling this if they didn't provide one, and you must use the exact item spelling found in get_daily_menu.
    """
    try:
        # Prevent LLM from guessing strings like "bad" instead of asking the user for a number
        if not str(rating).strip().isdigit() or not (1 <= int(str(rating).strip()) <= 5):
            return "ERROR: You MUST ask the user for a numeric rating (1-5) before submitting."
            
        req = MenuRatingRequest(
            campus_id=DEFAULT_CAMPUS_ID,
            user_id=user_id,
            date=date,
            day_name=day_name,
            meal_type=meal_type,
            item_name=item_name,
            rating=int(str(rating).strip()),
            comment=comment
        )
        res = save_rating(req, get_supabase())
        return str(res)
    except Exception as e:
        return f"Failed to submit rating: {e}"

MENU_TOOLS = [get_daily_menu, get_past_food_ratings, submit_food_rating]
