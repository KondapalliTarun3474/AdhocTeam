import type { AcademicCourse } from '../academics/types'

export interface AssignmentRecord {
  id: string
  campus_id: string
  course_id: string
  course_code: string
  course_name: string
  title: string
  description: string
  deadline_at: string
  created_by: string
}

export interface AssignmentSubmissionRecord {
  id: string
  campus_id: string
  assignment_id: string
  course_id: string
  user_id: string
  filename: string
  content_type: string
  size_bytes: number
  submitted_at: string
  status: string
}

export interface LmsWorkspace {
  campus_id: string
  user_id: string
  courses: AcademicCourse[]
  assignments: AssignmentRecord[]
  submissions: AssignmentSubmissionRecord[]
}
