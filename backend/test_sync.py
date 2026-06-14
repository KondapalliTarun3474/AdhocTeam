import os
from database import get_supabase
from modules.menu.service import sync_menu

supabase = get_supabase()
if not supabase:
    print("Supabase not configured")
    exit(1)

config = {
    "campus_id": "00000000-0000-0000-0000-000000000000",
    "source_url": None
}

try:
    success = sync_menu(config, supabase)
    print("Success:", success)
except Exception as e:
    import traceback
    traceback.print_exc()
