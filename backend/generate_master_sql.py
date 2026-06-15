import os
import sys
import json
import uuid
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.academics.service import list_sessions
from modules.campus_rooms.service import _seed_rooms, _seed_courses, _seed_bookings
from modules.campus_leave.service import _seed_profiles, _seed_applications
from modules.lms.service import _seed_assignments
from modules.exam_lms.service import _seed_quizzes, _seed_scores
from modules.announcements.service import _seed_announcements
from modules.erp.service import get_registered_course_ids

CAMPUS_ID = "00000000-0000-0000-0000-000000000000"
USER_ID = "demo-student"

def escape_sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list) or isinstance(value, dict):
        return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"
    return "'" + str(value).replace("'", "''") + "'"

TABLE_COLUMNS = {
    "campus_course_sessions": {
        "campus_id", "session_id", "course_id", "course_code", "course_name", 
        "professor_id", "professor_name", "day", "day_index", "start_time", 
        "end_time", "room_id", "room_name", "session_type", "is_tutorial"
    }
}

def generate_inserts(table_name, records):
    if not records:
        return []
    
    statements = []
    for record in records:
        data = record if isinstance(record, dict) else record.model_dump()
        
        # Filter keys based on schema if defined
        if table_name in TABLE_COLUMNS:
            valid = TABLE_COLUMNS[table_name]
            data = {k: v for k, v in data.items() if k in valid}
            
        columns = ", ".join(data.keys())
        values = ", ".join(escape_sql(v) for v in data.values())
        stmt = f"INSERT INTO {table_name} ({columns}) VALUES ({values}) ON CONFLICT DO NOTHING;"
        statements.append(stmt)
    return statements

def main():
    print("-- CAMPUS COPILOT MASTER SQL SETUP")
    print("-- This file contains the complete schema and mock data for all modules.")
    print("\n-- 1. SCHEMA DEFINITION --")
    
    with open("schema.sql", "r") as f:
        print(f.read())
        
    print("\n-- 2. MOCK DATA INSERTIONS --")
    
    # 1. Campus Rooms, Courses, Sessions, Bookings
    rooms = _seed_rooms(CAMPUS_ID)
    print("\n-- Campus Rooms")
    print("\n".join(generate_inserts("campus_rooms", rooms)))
    
    courses = _seed_courses(CAMPUS_ID)
    print("\n-- Campus Courses")
    print("\n".join(generate_inserts("campus_courses", courses)))
    
    sessions = list_sessions(CAMPUS_ID)
    print("\n-- Campus Course Sessions")
    print("\n".join(generate_inserts("campus_course_sessions", sessions)))
    
    bookings = _seed_bookings(CAMPUS_ID)
    for b in bookings:
        # Fix invalid UUID issue
        b.id = str(uuid.uuid5(uuid.NAMESPACE_OID, str(b.id)))
        # Fix Enum serialization issue
        if hasattr(b.booking_type, "value"):
            b.booking_type = b.booking_type.value
            
    print("\n-- Campus Room Bookings")
    print("\n".join(generate_inserts("campus_room_bookings", bookings)))
    
    # 2. Campus Leave
    profiles = _seed_profiles(CAMPUS_ID)
    print("\n-- Campus Student Profiles")
    print("\n".join(generate_inserts("campus_student_profiles", profiles)))
    
    applications = _seed_applications(CAMPUS_ID)
    print("\n-- Campus Leave Applications")
    print("\n".join(generate_inserts("campus_leave_applications", applications)))
    
    # 3. ERP Registrations
    course_ids = get_registered_course_ids(CAMPUS_ID, USER_ID)
    erp_records = [{"id": str(uuid.uuid4()), "campus_id": CAMPUS_ID, "user_id": USER_ID, "course_id": cid} for cid in course_ids]
    print("\n-- ERP Course Registrations")
    print("\n".join(generate_inserts("erp_course_registrations", erp_records)))
    
    # 4. LMS
    assignments = _seed_assignments(CAMPUS_ID)
    for a in assignments:
        a.id = str(uuid.uuid5(uuid.NAMESPACE_OID, str(a.id)))
    print("\n-- LMS Assignments")
    print("\n".join(generate_inserts("lms_assignments", assignments)))
    
    # 5. Exam LMS
    quizzes = _seed_quizzes(CAMPUS_ID)
    for q in quizzes:
        q.id = str(uuid.uuid5(uuid.NAMESPACE_OID, str(q.id)))
    print("\n-- Exam Quizzes")
    print("\n".join(generate_inserts("exam_quizzes", quizzes)))
    
    scores = _seed_scores(CAMPUS_ID, USER_ID)
    for s in scores:
        s.id = str(uuid.uuid5(uuid.NAMESPACE_OID, str(s.id)))
        s.quiz_id = str(uuid.uuid5(uuid.NAMESPACE_OID, str(s.quiz_id)))
    print("\n-- Exam Quiz Scores")
    print("\n".join(generate_inserts("exam_quiz_scores", scores)))
    
    # 6. Announcements
    announcements = _seed_announcements(CAMPUS_ID)
    for a in announcements:
        a.id = str(uuid.uuid5(uuid.NAMESPACE_OID, str(a.id)))
    print("\n-- Campus Announcements")
    print("\n".join(generate_inserts("campus_announcements", announcements)))

if __name__ == "__main__":
    main()
