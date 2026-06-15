from datetime import datetime, timedelta
from typing import Dict, List, Optional

from modules.academics.service import (
    DEFAULT_CAMPUS_ID,
    list_courses,
    list_sessions,
    session_datetimes,
)
from modules.erp.service import get_registered_course_ids
from modules.exam_lms.schemas import ExamWorkspace, QuizRecord, QuizScoreRecord


_QUIZZES: Dict[str, List[QuizRecord]] = {}
_SCORES: Dict[str, List[QuizScoreRecord]] = {}


def _seed_quizzes(campus_id: str = DEFAULT_CAMPUS_ID) -> List[QuizRecord]:
    quizzes: List[QuizRecord] = []
    for course in list_courses(campus_id):
        first_session = next(
            (session for session in list_sessions(campus_id, [course.course_id]) if not session.is_tutorial),
            None,
        )
        if not first_session:
            continue
        start_at, _ = session_datetimes(first_session)
        start_dt = datetime.fromisoformat(start_at) + timedelta(days=7)
        end_dt = start_dt + timedelta(minutes=45)
        quizzes.append(
            QuizRecord(
                id=f"quiz-{course.course_id}",
                campus_id=campus_id,
                course_id=course.course_id,
                course_code=course.course_code,
                course_name=course.course_name,
                title="Quiz 1",
                start_at=start_dt.isoformat(),
                end_at=end_dt.isoformat(),
                room_name=first_session.room_name,
                status="scheduled",
            )
        )
    return sorted(quizzes, key=lambda quiz: quiz.start_at)


def list_quizzes(
    campus_id: str = DEFAULT_CAMPUS_ID,
    course_ids: Optional[List[str]] = None,
) -> List[QuizRecord]:
    if campus_id not in _QUIZZES:
        _QUIZZES[campus_id] = _seed_quizzes(campus_id)
    quizzes = _QUIZZES[campus_id]
    if course_ids:
        selected = set(course_ids)
        quizzes = [quiz for quiz in quizzes if quiz.course_id in selected]
    return sorted(quizzes, key=lambda quiz: quiz.start_at)


def _seed_scores(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> List[QuizScoreRecord]:
    scores = []
    registered = get_registered_course_ids(campus_id, user_id)
    for index, quiz in enumerate(list_quizzes(campus_id, registered)):
        released = index % 2 == 0
        scores.append(
            QuizScoreRecord(
                id=f"score-{quiz.id}-{user_id}",
                campus_id=campus_id,
                quiz_id=quiz.id,
                course_id=quiz.course_id,
                user_id=user_id,
                score=82 + (index % 4) * 3 if released else None,
                max_score=100,
                released=released,
            )
        )
    return scores


def list_scores(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
) -> List[QuizScoreRecord]:
    key = f"{campus_id}:{user_id}"
    if key not in _SCORES:
        _SCORES[key] = _seed_scores(campus_id, user_id)
    return _SCORES[key]


def get_workspace(
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    include_all: bool = False,
) -> ExamWorkspace:
    course_ids = None if include_all else get_registered_course_ids(campus_id, user_id)
    courses = list_courses(campus_id)
    if course_ids:
        selected = set(course_ids)
        courses = [course for course in courses if course.course_id in selected]
    return ExamWorkspace(
        campus_id=campus_id,
        user_id=user_id,
        courses=courses,
        quizzes=list_quizzes(campus_id, course_ids),
        scores=list_scores(campus_id, user_id),
    )
