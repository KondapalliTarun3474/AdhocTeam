import rawCatalog from './defaultCourses.json'
import type {
  AcademicCatalog,
  AcademicCourse,
  CourseConflict,
  CourseSession,
  PersonalCalendar,
  PersonalCalendarItem,
} from './types'

const catalog = rawCatalog as AcademicCatalog
const DEFAULT_CAMPUS_ID = '00000000-0000-0000-0000-000000000000'

export const DEFAULT_REGISTERED_COURSE_IDS = [
  'aid-836-3d-computer-vision',
  'aid-608-networks-and-semantics-i',
  'ait-512-mathematics-for-machine-learning',
  'das-732-data-visualization',
  'ait-707-theory-of-large-language-models',
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const COLOR_KEYS = ['blue', 'orange', 'cyan', 'ink']

function withCampus<T extends object>(item: T, campusId: string) {
  return { ...item, campus_id: campusId }
}

export function fallbackCourses(campusId = DEFAULT_CAMPUS_ID): AcademicCourse[] {
  return catalog.courses.map((course) => withCampus(course, campusId))
}

export function fallbackSessions(
  campusId = DEFAULT_CAMPUS_ID,
  courseIds?: string[],
): CourseSession[] {
  const selected = new Set(courseIds ?? [])
  return catalog.sessions
    .filter((session) => selected.size === 0 || selected.has(session.course_id))
    .map((session) => withCampus(session, campusId))
}

export function minutesFor(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours * 60) + minutes
}

function overlaps(left: CourseSession, right: CourseSession) {
  if (left.day_index !== right.day_index) return false
  return minutesFor(left.start_time) < minutesFor(right.end_time)
    && minutesFor(right.start_time) < minutesFor(left.end_time)
}

export function findCourseConflicts(
  registeredCourseIds: string[],
  candidateCourseId: string,
  campusId = DEFAULT_CAMPUS_ID,
): CourseConflict[] {
  const existingSessions = fallbackSessions(campusId, registeredCourseIds)
  const candidateSessions = fallbackSessions(campusId, [candidateCourseId])
  const course = fallbackCourses(campusId).find((item) => item.course_id === candidateCourseId)
  if (!course) return []

  const conflicts: CourseConflict[] = []
  candidateSessions.forEach((candidate) => {
    existingSessions.forEach((existing) => {
      if (overlaps(candidate, existing)) {
        conflicts.push({
          course_id: course.course_id,
          course_code: course.course_code,
          course_name: course.course_name,
          conflicts_with: `${existing.course_code} - ${existing.course_name}`,
          day: candidate.day,
          start_label: candidate.start_label,
          end_label: candidate.end_label,
        })
      }
    })
  })
  return conflicts
}

export function buildPersonalCalendar(
  registeredCourseIds = DEFAULT_REGISTERED_COURSE_IDS,
  campusId = DEFAULT_CAMPUS_ID,
  date = new Date(),
): PersonalCalendar {
  const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1
  const sessions = fallbackSessions(campusId, registeredCourseIds)
    .filter((session) => session.day_index === dayIndex)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const items: PersonalCalendarItem[] = []

  sessions.forEach((session, index) => {
    const previous = sessions[index - 1]
    if (previous && minutesFor(previous.end_time) < minutesFor(session.start_time)) {
      items.push({
        id: `break-${previous.session_id}-${session.session_id}`,
        type: 'break',
        label: 'Break',
        start_time: previous.end_time,
        end_time: session.start_time,
        start_label: previous.end_label,
        end_label: session.start_label,
        color_key: 'cyan',
      })
    }
    items.push({
      id: session.session_id,
      type: session.session_type,
      label: `${session.course_code} · ${session.room_name}`,
      course_id: session.course_id,
      course_code: session.course_code,
      course_name: session.course_name,
      professor_name: session.professor_name,
      room_name: session.room_name,
      start_time: session.start_time,
      end_time: session.end_time,
      start_label: session.start_label,
      end_label: session.end_label,
      color_key: COLOR_KEYS[index % COLOR_KEYS.length],
    })
  })

  return {
    date: date.toISOString().slice(0, 10),
    day_name: DAY_NAMES[date.getDay()],
    items,
  }
}
