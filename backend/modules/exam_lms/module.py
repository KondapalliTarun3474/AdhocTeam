from typing import Any, Dict, Tuple

from core.module_registry import CampusModule
from core.rbac import Designation, Role
from modules.exam_lms.router import router
from modules.exam_lms.service import get_workspace
from modules.exam_lms.tools import EXAM_TOOLS


def exam_hub_provider(
    campus_id: str,
    user_id: str,
    role: Role,
    today: str,
    designations: Tuple[Designation, ...],
) -> Dict[str, Any]:
    workspace = get_workspace(campus_id=campus_id, user_id=user_id)
    next_quiz = workspace.quizzes[0] if workspace.quizzes else None
    return {
        "notifications": [
            {
                "id": f"exam-{next_quiz.id}",
                "module_key": "exam_lms",
                "title": f"{next_quiz.course_code}: {next_quiz.title}",
                "body": f"Scheduled from {next_quiz.start_at.replace('T', ' ')} to {next_quiz.end_at.split('T')[-1]}",
                "priority": "normal",
            }
        ] if next_quiz else [],
        "module_data": {
            "exam_lms": {
                "quiz_count": len(workspace.quizzes),
                "next_quiz": next_quiz.dict() if next_quiz else None,
            }
        },
    }


MODULE = CampusModule(
    key="exam_lms",
    name="Exam Portal",
    status="connected",
    summary="Quiz schedule, start and end times, and released scores.",
    roles=(Role.STUDENT, Role.PROFESSOR, Role.ADMIN),
    designations=(Designation.TEACHING_ASSISTANT,),
    router=router,
    hub_provider=exam_hub_provider,
    agent_tools=EXAM_TOOLS,
)
