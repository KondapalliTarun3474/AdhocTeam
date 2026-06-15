import type { AcademicCourse } from '../academics/types'

export interface QuizRecord {
  id: string
  campus_id: string
  course_id: string
  course_code: string
  course_name: string
  title: string
  start_at: string
  end_at: string
  room_name: string
  status: string
}

export interface QuizScoreRecord {
  id: string
  campus_id: string
  quiz_id: string
  course_id: string
  user_id: string
  score?: number | null
  max_score: number
  released: boolean
}

export interface ExamWorkspace {
  campus_id: string
  user_id: string
  courses: AcademicCourse[]
  quizzes: QuizRecord[]
  scores: QuizScoreRecord[]
}
