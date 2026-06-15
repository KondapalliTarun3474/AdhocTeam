import type { AcademicCourse, CourseSession, PersonalCalendar } from '../academics/types'

export interface ErpWorkspace {
  campus_id: string
  user_id: string
  courses: AcademicCourse[]
  registered_course_ids: string[]
  registered_courses: AcademicCourse[]
  registered_sessions: CourseSession[]
  personal_calendar: PersonalCalendar
}
