from typing import Optional
from langchain_core.tools import tool
from database import get_supabase
from modules.menu.service import get_menu_for_date, save_rating, get_user_food_ratings, DEFAULT_CAMPUS_ID
from modules.menu.schemas import MenuRatingRequest

@tool
def get_daily_menu(date: str) -> str:
    """Fetch the campus food menu for a specific date.
    Data Returned (JSON): date, day_name, and meals (array containing meal_type, start_time, end_time, and items).
    Use Cases: Use this when the user asks "what is for lunch today?" or "what's on the menu?".
    Constraints: You MUST provide the date argument in YYYY-MM-DD format. You MUST use this tool to discover the exact correct spelling of a dish BEFORE attempting to submit a food rating.
    """
    try:
        menu = get_menu_for_date(campus_id=DEFAULT_CAMPUS_ID, target_date=date)
        return menu.json()
    except Exception as e:
        return f"Error retrieving menu: {e}"

@tool
def get_past_food_ratings(user_id: str) -> str:
    """Get all past food ratings (1-5 stars) and comments submitted by this specific user.
    Data Returned (JSON): array of historical rating objects containing item_name, rating, comment, date, and meal_type.
    Use Cases: Use this when the user asks what they rated a dish in the past, or proactively when advising them on whether they should skip a meal based on historical preferences.
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
    comment: str = ""
) -> str:
    """Submit a star rating (1-5) and an optional comment for a specific food item to the database.
    Data Returned (String): success string or an ERROR message.
    Use Cases: Use this ONLY when the user explicitly asks to rate a food item.
    Constraints: You MUST ask the user for a 1-5 star numeric rating before calling this if they didn't provide one. Do NOT infer ratings. You MUST use the exact item spelling found by calling `get_daily_menu` first.
    """
    try:
        # Prevent LLM from guessing strings like "bad" instead of asking the user for a number
        if not str(rating).strip().isdigit() or not (1 <= int(str(rating).strip()) <= 5):
            return "ERROR: You MUST ask the user for a numeric rating (1-5) before submitting."
            
        # Guarantee exact spelling against the actual menu FOR THE SPECIFIC MEAL
        menu = get_menu_for_date(campus_id=DEFAULT_CAMPUS_ID, target_date=date)
        valid_items = []
        for meal in menu.meals:
            # Handle plural vs singular like "snack" vs "snacks"
            if meal_type.lower() in meal.meal_type.lower() or meal.meal_type.lower() in meal_type.lower():
                valid_items.extend(meal.items)
                
        if not valid_items:
            return f"ERROR: Could not find any items for meal type '{meal_type}' on {date}."
            
        import difflib
        
        # Make matching case-insensitive
        valid_items_map = {item.lower(): item for item in valid_items}
        matches = difflib.get_close_matches(item_name.lower(), list(valid_items_map.keys()), n=1, cutoff=0.5)
        
        if matches:
            exact_item_name = valid_items_map[matches[0]]
        else:
            return f"ERROR: '{item_name}' is not on the {meal_type} menu for {date}. Valid items for {meal_type} are: {', '.join(valid_items)}"
            
        req = MenuRatingRequest(
            campus_id=DEFAULT_CAMPUS_ID,
            user_id=user_id,
            date=date,
            day_name=day_name,
            meal_type=meal_type,
            item_name=exact_item_name,
            rating=int(str(rating).strip()),
            comment=comment
        )
        res = save_rating(req, get_supabase())
        
        # --- EXTERNAL API INTEGRATION (LIVE DEMO) ---
        import os
        from dotenv import load_dotenv
        load_dotenv(override=True)
        token = os.getenv("DEMO_EXTERNAL_FOOD_TOKEN")
        if token:
            db = get_supabase()
            response = db.table("meals").select("raw_payload").eq("campus_id", DEFAULT_CAMPUS_ID).eq("date", date).eq("meal_type", meal_type.lower()).execute()
            if response.data and response.data[0].get("raw_payload"):
                import json
                try:
                    payload = json.loads(response.data[0]["raw_payload"])
                    meal_id = payload.get("_id")
                    item_id = None
                    for item in payload.get("items", []):
                        if str(item.get("name", "")).lower() == exact_item_name.lower():
                            item_id = item.get("_id")
                            break
                            
                    if meal_id and item_id:
                        import requests
                        url = f"https://foodcommittee.iiitb.ac.in/api/user/rating/{meal_id}"
                        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                        data = {"Rating": [{"itemId": item_id, "rating": int(str(rating).strip())}]}
                        res_ext = requests.put(url, headers=headers, json=data)
                        res_ext.raise_for_status()
                        return f"{str(res)} (And successfully synchronized with live foodcommittee.iiitb.ac.in!)"
                except Exception as e:
                    pass # Continue to return local success even if external fails
        # ---------------------------------------------
        
        return str(res)
    except Exception as e:
        return f"Failed to submit rating: {e}"

MENU_TOOLS = [get_daily_menu, get_past_food_ratings, submit_food_rating]
