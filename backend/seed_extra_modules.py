import os
import sys
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import get_supabase

def seed():
    supabase = get_supabase()
    campus_id = "00000000-0000-0000-0000-000000000000"
    user_id = "demo-student"

    print("Seeding ERP...")
    supabase.table("erp_course_registrations").upsert([
        {"campus_id": campus_id, "user_id": user_id, "course_id": "cse-602-advanced-algorithms"},
        {"campus_id": campus_id, "user_id": user_id, "course_id": "aid-608-networks-and-semantics-i"}
    ]).execute()

    print("Seeding LMS...")
    now = datetime.now()
    supabase.table("lms_assignments").upsert([
        {
            "id": str(uuid.uuid4()), "campus_id": campus_id, "course_id": "cse-602-advanced-algorithms",
            "course_code": "CSE 602", "course_name": "Advanced Algorithms", "title": "Dynamic Programming Assignment",
            "description": "Solve the Longest Common Subsequence problem.", "deadline_at": (now + timedelta(days=3)).isoformat(),
            "created_by": "prof-muralidhara"
        },
        {
            "id": str(uuid.uuid4()), "campus_id": campus_id, "course_id": "aid-608-networks-and-semantics-i",
            "course_code": "AID 608", "course_name": "Networks and Semantics - I", "title": "Semantic Web Analysis",
            "description": "Write a 2-page report on RDF.", "deadline_at": (now + timedelta(days=7)).isoformat(),
            "created_by": "prof-srinath"
        }
    ]).execute()

    print("Seeding Exam Quizzes...")
    supabase.table("exam_quizzes").upsert([
        {
            "id": "q1-uuid", "campus_id": campus_id, "course_id": "cse-602-advanced-algorithms",
            "course_code": "CSE 602", "course_name": "Advanced Algorithms", "title": "Midterm Quiz 1",
            "start_at": (now + timedelta(days=2)).isoformat(), "end_at": (now + timedelta(days=2, hours=1)).isoformat(),
            "room_name": "R104", "status": "scheduled"
        },
        {
            "id": "q2-uuid", "campus_id": campus_id, "course_id": "aid-608-networks-and-semantics-i",
            "course_code": "AID 608", "course_name": "Networks and Semantics - I", "title": "Surprise Quiz",
            "start_at": (now - timedelta(days=1)).isoformat(), "end_at": (now - timedelta(days=1, hours=-1)).isoformat(),
            "room_name": "R102", "status": "completed"
        }
    ]).execute()

    supabase.table("exam_quiz_scores").upsert([
        {"campus_id": campus_id, "quiz_id": "q2-uuid", "course_id": "aid-608-networks-and-semantics-i", "user_id": user_id, "score": 85.5, "max_score": 100, "released": True}
    ]).execute()

    print("Seeding Announcements...")
    supabase.table("campus_announcements").upsert([
        {
            "id": str(uuid.uuid4()), "campus_id": campus_id, "title": "Turing Hackathon 2026", "body": "Registrations open!",
            "category": "events", "tag": "hackathon", "created_by": "sac", "created_by_name": "Student Council",
            "audience": "students", "priority": "high"
        },
        {
            "id": str(uuid.uuid4()), "campus_id": campus_id, "title": "Class Relocated", "body": "Class moved to A304.",
            "category": "academics", "tag": "urgent", "course_id": "cse-602-advanced-algorithms",
            "course_code": "CSE 602", "course_name": "Advanced Algorithms", "created_by": "prof-muralidhara",
            "created_by_name": "Muralidhara V N", "audience": "students", "priority": "high"
        }
    ]).execute()

    print("✅ Data successfully pushed!")

if __name__ == "__main__":
    seed()
