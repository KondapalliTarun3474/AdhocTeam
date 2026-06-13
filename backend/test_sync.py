import os
from database import get_supabase
from connectors.mess.sync import sync_mess_menu

supabase = get_supabase()
if not supabase:
    print("Supabase not configured")
    exit(1)

config = {
    "campus_id": "00000000-0000-0000-0000-000000000000",
    "source_url": "default.json"
}

try:
    success = sync_mess_menu(config, supabase)
    print("Success:", success)
except Exception as e:
    import traceback
    traceback.print_exc()
