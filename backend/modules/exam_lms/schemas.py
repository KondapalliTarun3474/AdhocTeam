from typing import List, Optional

from pydantic import BaseModel

from modules.academics.schemas import AcademicCourse


class QuizRecord(BaseModel):
    id: str
    campus_id: str
    course_id: str
    course_code: str
    course_name: str
    title: str
    start_at: str
    end_at: str
    room_name: str
    status: str = "scheduled"


class QuizScoreRecord(BaseModel):
    id: str
    campus_id: str
    quiz_id: str
    course_id: str
    user_id: str
    score: Optional[float] = None
    max_score: float = 100
    released: bool = False


class ExamWorkspace(BaseModel):
    campus_id: str
    user_id: str
    courses: List[AcademicCourse]
    quizzes: List[QuizRecord]
    scores: List[QuizScoreRecord]
