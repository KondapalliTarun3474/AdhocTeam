import os
import json
import requests
from datetime import datetime
from database import get_supabase
from modules.menu.service import DEFAULT_CAMPUS_ID

def sync_live_food_menu():
    """
    Background worker that fetches the live menu from foodcommittee.iiitb.ac.in
    and syncs it to the local Supabase 'meals' table.
    """
    token = os.getenv("DEMO_EXTERNAL_FOOD_TOKEN")
    if not token:
        print("Worker: No DEMO_EXTERNAL_FOOD_TOKEN found. Skipping live menu sync.")
        return

    print("Worker: Syncing live menu from foodcommittee.iiitb.ac.in...")
    
    url = "https://foodcommittee.iiitb.ac.in/api/user/menu"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Worker: Failed to fetch live menu: {e}")
        return

    supabase = get_supabase()
    if not supabase:
        print("Worker: Supabase not connected.")
        return

    success_count = 0
    days = data.get("days", [])
    
    for day in days:
        try:
            # The API returns dates like "2026-06-14T18:30:00.000Z". 
            # In IST, 18:30 UTC is exactly midnight of the NEXT day!
            # Let's parse it and format it as YYYY-MM-DD
            # Actually we just want the date part, let's just use the first 10 chars of the day string if it's already localized, 
            # or add 5.5 hours to get IST.
            dt_utc = datetime.strptime(day["date"], "%Y-%m-%dT%H:%M:%S.%fZ")
            # Convert to naive IST (+5:30)
            import datetime as dt
            dt_ist = dt_utc + dt.timedelta(hours=5, minutes=30)
            date_str = dt_ist.strftime("%Y-%m-%d")
            
            for meal in day.get("meals", []):
                meal_type = meal.get("name")
                if not meal_type:
                    continue
                    
                # Extract simple string items for the AI
                items = [item.get("name") for item in meal.get("items", []) if item.get("name")]
                
                # We store the raw meal dict (which contains item _id's) in raw_payload
                row = {
                    "campus_id": DEFAULT_CAMPUS_ID,
                    "date": date_str,
                    "meal_type": meal_type.lower(),
                    "items": items,
                    "source": "foodcommittee_live_api",
                    "raw_payload": json.dumps(meal)
                }
                
                supabase.table("meals").upsert(
                    row, 
                    on_conflict="campus_id,date,meal_type"
                ).execute()
                success_count += 1
                
        except Exception as e:
            print(f"Worker: Error processing day {day.get('date')}: {e}")
            continue
            
    print(f"Worker: Successfully synced {success_count} meals from the live website!")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sync_live_food_menu()
