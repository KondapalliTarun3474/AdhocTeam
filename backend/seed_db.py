import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_supabase
from modules.menu.service import DEFAULT_CAMPUS_ID, _load_seed_weekly_menu, upsert_weekly_menu
from modules.campus_rooms.service import _seed_rooms, _seed_courses, _seed_bookings
from modules.campus_leave.service import _seed_profiles, _seed_applications

def seed():
    supabase = get_supabase()
    if not supabase:
        print("Error: Supabase is not connected. Check your .env file.")
        return

    print("Seeding Menu (Foode)...")
    try:
        # Load the default menu from JSON
        weekly_menu = _load_seed_weekly_menu(DEFAULT_CAMPUS_ID)
        # Upsert pushes it to Supabase
        upsert_weekly_menu(weekly_menu, supabase)
        print("✅ Menu seeded.")
    except Exception as e:
        print(f"❌ Failed to seed menu: {e}")

    print("Seeding Campus Rooms & Courses...")
    try:
        rooms = _seed_rooms(DEFAULT_CAMPUS_ID)
        for room in rooms:
            supabase.table("campus_rooms").upsert(room.dict(), on_conflict="campus_id,room_id").execute()
        
        courses = _seed_courses(DEFAULT_CAMPUS_ID)
        for course in courses:
            supabase.table("campus_courses").upsert(course.dict(), on_conflict="campus_id,course_id").execute()

        from modules.academics.service import list_sessions
        sessions = list_sessions(DEFAULT_CAMPUS_ID)
        for session in sessions:
            supabase.table("campus_course_sessions").upsert(session.dict(), on_conflict="campus_id,session_id").execute()

        bookings = _seed_bookings(DEFAULT_CAMPUS_ID)
        for booking in bookings:
            supabase.table("campus_room_bookings").upsert(booking.dict(), on_conflict="id").execute()
        print("✅ Campus Rooms & Courses seeded.")
    except Exception as e:
        print(f"❌ Failed to seed campus rooms & courses: {e}")

    print("Seeding Campus Leave...")
    try:
        profiles = _seed_profiles(DEFAULT_CAMPUS_ID)
        for profile in profiles:
            supabase.table("campus_student_profiles").upsert(profile.dict(), on_conflict="campus_id,user_id").execute()

        applications = _seed_applications(DEFAULT_CAMPUS_ID)
        for app in applications:
            supabase.table("campus_leave_applications").insert(app.dict()).execute()
        print("✅ Campus Leave seeded.")
    except Exception as e:
        print(f"❌ Failed to seed campus leave: {e}")

    print("🎉 All done!")

if __name__ == "__main__":
    seed()
