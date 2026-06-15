import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from database import get_supabase
from modules.academics.service import DEFAULT_CAMPUS_ID, get_course, list_courses
from modules.announcements.schemas import (
    AnnouncementCreateRequest,
    AnnouncementRecord,
    AnnouncementsWorkspace,
)


_ANNOUNCEMENTS: Dict[str, List[AnnouncementRecord]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_announcements(campus_id: str = DEFAULT_CAMPUS_ID) -> List[AnnouncementRecord]:
    courses = list_courses(campus_id)
    selected = courses[:5]
    base_time = datetime.now(timezone.utc)
    course_announcements = [
        ("New Assignment", "Assignment 1 is available in LMS.", "Courses", "Assignment"),
        ("Quiz Scheduled", "Quiz 1 has been scheduled in the Exam Portal.", "Courses", "Quiz"),
        ("Results Released", "Quiz scores are now available for review.", "Courses", "Results"),
    ]
    records: List[AnnouncementRecord] = []
    for index, course in enumerate(selected[:3]):
        title, body, category, tag = course_announcements[index]
        records.append(
            AnnouncementRecord(
                id=f"ann-{tag.lower()}-{course.course_id}",
                campus_id=campus_id,
                title=f"{course.course_code}: {title}",
                body=body,
                category=category,
                tag=tag,
                course_id=course.course_id,
                course_code=course.course_code,
                course_name=course.course_name,
                created_by=course.professor_id,
                created_by_name=course.professor_name,
                priority="high" if tag in {"Assignment", "Quiz"} else "normal",
                created_at=(base_time - timedelta(hours=index + 1)).isoformat(),
            )
        )

    records.extend([
        AnnouncementRecord(
            id="ann-hackathon-campus",
            campus_id=campus_id,
            title="Oracle Hackathon Prep Session",
            body="Campus-wide prep session for product demos and pitch refinement.",
            category="Hackathons",
            tag="Hackathon",
            created_by="prof-campus",
            created_by_name="Faculty Coordinator",
            audience="campus",
            priority="high",
            created_at=(base_time - timedelta(hours=5)).isoformat(),
        ),
        AnnouncementRecord(
            id="ann-placement-campus",
            campus_id=campus_id,
            title="Placement Opportunity: Product Engineering Internships",
            body="Students interested in product engineering roles should update ERP preferences.",
            category="Placements",
            tag="Placement",
            created_by="prof-placement",
            created_by_name="Placement Office",
            audience="campus",
            priority="normal",
            created_at=(base_time - timedelta(hours=8)).isoformat(),
        ),
        AnnouncementRecord(
            id="ann-resource-campus",
            campus_id=campus_id,
            title="Resource Pack: Research Writing Templates",
            body="Templates and guides are available for project proposals and research reports.",
            category="Resources",
            tag="Resource",
            created_by="prof-resource",
            created_by_name="Academic Office",
            audience="campus",
            priority="low",
            created_at=(base_time - timedelta(hours=11)).isoformat(),
        ),
    ])
    return records


def list_announcements(
    campus_id: str = DEFAULT_CAMPUS_ID,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    course_id: Optional[str] = None,
) -> List[AnnouncementRecord]:
    if campus_id not in _ANNOUNCEMENTS:
        _ANNOUNCEMENTS[campus_id] = _seed_announcements(campus_id)
    records = _ANNOUNCEMENTS[campus_id]
    if category:
        records = [record for record in records if record.category.lower() == category.lower()]
    if tag:
        records = [record for record in records if record.tag.lower() == tag.lower()]
    if course_id:
        records = [record for record in records if record.course_id == course_id]
    return sorted(records, key=lambda record: record.created_at, reverse=True)


def create_announcement(request: AnnouncementCreateRequest, supabase: Any) -> Dict[str, Any]:
    course = get_course(request.course_id, request.campus_id) if request.course_id else None
    record = AnnouncementRecord(
        id=str(uuid.uuid4()),
        campus_id=request.campus_id,
        title=request.title,
        body=request.body,
        category=request.category,
        tag=request.tag,
        course_id=course.course_id if course else request.course_id,
        course_code=course.course_code if course else None,
        course_name=course.course_name if course else None,
        created_by=request.created_by,
        created_by_name=request.created_by_name,
        audience=request.audience,
        priority=request.priority,
        created_at=_now_iso(),
    )
    _ANNOUNCEMENTS.setdefault(request.campus_id, _seed_announcements(request.campus_id)).insert(0, record)

    if supabase:
        try:
            supabase.table("campus_announcements").insert(record.dict()).execute()
            status = "success"
        except Exception:
            status = "preview"
    else:
        status = "preview"
    return {"status": status, "data": record.dict()}


def get_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    course_id: Optional[str] = None,
) -> AnnouncementsWorkspace:
    records = list_announcements(campus_id, category, tag, course_id)
    all_records = list_announcements(campus_id)
    return AnnouncementsWorkspace(
        campus_id=campus_id,
        announcements=records,
        categories=sorted({record.category for record in all_records}),
        tags=sorted({record.tag for record in all_records}),
    )
