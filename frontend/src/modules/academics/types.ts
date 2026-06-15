export interface AcademicCourse {
  campus_id?: string
  course_id: string
  course_code: string
  course_name: string
  course_label: string
  department: string
  credits: number
  term: string
  professor_id: string
  professor_name: string
  instructors: string[]
  room: string
  raw_timings: string
}

export interface CourseSession {
  campus_id?: string
  session_id: string
  course_id: string
  course_code: string
  course_name: string
  title: string
  department: string
  professor_id: string
  professor_name: string
  day: string
  day_index: number
  start_time: string
  end_time: string
  start_label: string
  end_label: string
  duration_minutes: number
  room_id: string
  room_name: string
  is_tutorial: boolean
  session_type: string
}

export interface PersonalCalendarItem {
  id: string
  type: string
  label: string
  course_id?: string | null
  course_code?: string | null
  course_name?: string | null
  professor_name?: string | null
  room_name?: string | null
  start_time: string
  end_time: string
  start_label: string
  end_label: string
  color_key: string
}

export interface PersonalCalendar {
  date: string
  day_name: string
  items: PersonalCalendarItem[]
}

export interface CourseConflict {
  course_id: string
  course_code: string
  course_name: string
  conflicts_with: string
  day: string
  start_label: string
  end_label: string
}

export interface AcademicCatalog {
  source: string
  term: string
  class_duration_minutes: number
  courses: AcademicCourse[]
  sessions: CourseSession[]
}
