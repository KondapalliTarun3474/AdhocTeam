from datetime import date
from .fetcher import fetch_default_json
from .schema import MessMenuSchema, MealSchema
from supabase import Client

def parse_default_json(raw_json: dict, target_date: str) -> MessMenuSchema:
    meals = []
    for meal_type, items in raw_json.items():
        meals.append(MealSchema(meal_type=meal_type, items=items))
    return MessMenuSchema(date=target_date, meals=meals)

def sync_mess_menu(config: dict, supabase: Client):
    """
    Syncs the mess menu data into Supabase based on the connector config.
    """
    campus_id = config.get("campus_id")
    source_url = config.get("source_url", "default.json")
    
    # 1. Fetch
    raw_data = fetch_default_json(source_url)
    
    # 2. Parse
    today_str = date.today().isoformat()
    parsed_menu = parse_default_json(raw_data, today_str)
    
    # 3. Upsert to Supabase
    success_count = 0
    for meal in parsed_menu.meals:
        data = {
            "campus_id": campus_id,
            "date": parsed_menu.date,
            "meal_type": meal.meal_type,
            "items": meal.items,
            "source": "default_json",
            "raw_payload": str(raw_data)
        }
        
        # Supabase upsert relies on the unique constraint on (campus_id, date, meal_type)
        response = supabase.table("meals").upsert(data).execute()
        if response.data:
            success_count += 1
            
    return success_count == len(parsed_menu.meals)
