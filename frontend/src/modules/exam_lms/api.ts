import { API_BASE, DEFAULT_CAMPUS_ID } from '../../api/client'
import type { Designation, Role } from '../../types/campus'
import { DEFAULT_REGISTERED_COURSE_IDS, fallbackCourses, fallbackSessions } from '../academics/catalog'
import type { ExamWorkspace, QuizRecord, QuizScoreRecord } from './types'

interface RequestOptions {
  role: Role
  designations: Designation[]
}

function nextWeekIsoForSession(startTime: string, dayIndex: number) {
  const now = new Date()
  const monday = new Date(now)
  const day = now.getDay()
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day) + 7 + dayIndex)
  const [hours, minutes] = startTime.split(':').map(Number)
  monday.setHours(hours, minutes, 0, 0)
  return monday
}

export function fallbackExamWorkspace(campusId = DEFAULT_CAMPUS_ID, userId = 'demo-student'): ExamWorkspace {
  const courses = fallbackCourses(campusId).filter((course) => DEFAULT_REGISTERED_COURSE_IDS.includes(course.course_id))
  const quizzes: QuizRecord[] = courses.map((course) => {
    const session = fallbackSessions(campusId, [course.course_id]).find((item) => !item.is_tutorial)
    const start = session ? nextWeekIsoForSession(session.start_time, session.day_index) : new Date()
    const end = new Date(start)
    end.setMinutes(start.getMinutes() + 45)
    return {
      id: `quiz-${course.course_id}`,
      campus_id: campusId,
      course_id: course.course_id,
      course_code: course.course_code,
      course_name: course.course_name,
      title: 'Quiz 1',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      room_name: session?.room_name ?? course.room,
      status: 'scheduled',
    }
  })
  const scores: QuizScoreRecord[] = quizzes.map((quiz, index) => ({
    id: `score-${quiz.id}`,
    campus_id: campusId,
    quiz_id: quiz.id,
    course_id: quiz.course_id,
    user_id: userId,
    score: index % 2 === 0 ? 82 + (index * 3) : null,
    max_score: 100,
    released: index % 2 === 0,
  }))
  return { campus_id: campusId, user_id: userId, courses, quizzes, scores }
}

async function examRequest<T>(path: string, { role, designations }: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': role,
      'X-User-Designations': designations.join(','),
    },
  })
  if (!response.ok) throw new Error(`Exam API ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchExamWorkspace(
  campusId: string,
  userId: string,
  role: Role,
  designations: Designation[],
): Promise<ExamWorkspace> {
  const params = new URLSearchParams({ campus_id: campusId, user_id: userId })
  try {
    return await examRequest<ExamWorkspace>(`/api/modules/exam-lms/workspace?${params.toString()}`, {
      role,
      designations,
    })
  } catch (error) {
    return fallbackExamWorkspace(campusId, userId)
  }
}
