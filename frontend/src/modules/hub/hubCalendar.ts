import type { HubOverview } from '../../types/campus'
import type { PersonalCalendar } from '../academics/types'
import type { ErpWorkspace } from '../erp/types'
import type { ExamWorkspace } from '../exam_lms/types'
import type { LmsWorkspace } from '../lms/types'

export type HubCalendarMode = 'day' | 'week' | 'agenda'
export type HubCalendarEventKind = 'class' | 'break' | 'assignment' | 'quiz'

export interface HubCalendarEvent {
  id: string
  kind: HubCalendarEventKind
  title: string
  subtitle: string
  source: string
  date: string
  dayIndex: number
  dayName: string
  startTime: string
  endTime: string
  startLabel: string
  endLabel: string
  colorKey: string
}

export const ACADEMIC_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const EVENT_START_MINUTE = 7 * 60
const EVENT_END_MINUTE = 22 * 60
const COLOR_KEYS = ['blue', 'orange', 'cyan', 'ink']

export function getPersonalCalendar(overview: HubOverview | null): PersonalCalendar | null {
  const candidate = overview?.module_data?.personal_calendar
  if (
    candidate
    && typeof candidate === 'object'
    && Array.isArray((candidate as PersonalCalendar).items)
  ) {
    return candidate as PersonalCalendar
  }
  return null
}

export function minutesFor(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours * 60) + minutes
}

export function formatClock(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function dateIso(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function academicDayIndexForDate(value: Date) {
  const day = value.getDay()
  if (day === 0) return 5
  return Math.min(day - 1, 5)
}

export function startOfAcademicWeek(value = new Date()) {
  const date = new Date(value)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  date.setHours(0, 0, 0, 0)
  return date
}

export function dateForAcademicDay(dayIndex: number, baseDate = new Date()) {
  const date = startOfAcademicWeek(baseDate)
  date.setDate(date.getDate() + dayIndex)
  return date
}

export function eventPosition(event: HubCalendarEvent) {
  const start = Math.max(minutesFor(event.startTime), EVENT_START_MINUTE)
  const end = Math.min(minutesFor(event.endTime), EVENT_END_MINUTE)
  const total = EVENT_END_MINUTE - EVENT_START_MINUTE
  return {
    top: `${((start - EVENT_START_MINUTE) / total) * 100}%`,
    height: `${Math.max(((end - start) / total) * 100, 5)}%`,
  }
}

function eventDateParts(value: string) {
  const date = new Date(value)
  return {
    date: dateIso(date),
    dayIndex: academicDayIndexForDate(date),
    dayName: ACADEMIC_DAYS[academicDayIndexForDate(date)] ?? 'Saturday',
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  }
}

function addBreaks(events: HubCalendarEvent[]) {
  const grouped = new Map<number, HubCalendarEvent[]>()
  events.forEach((event) => {
    if (event.kind === 'class') {
      grouped.set(event.dayIndex, [...(grouped.get(event.dayIndex) ?? []), event])
    }
  })

  const breaks: HubCalendarEvent[] = []
  grouped.forEach((items, dayIndex) => {
    const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime))
    sorted.forEach((event, index) => {
      const next = sorted[index + 1]
      if (!next) return
      if (minutesFor(event.endTime) + 15 <= minutesFor(next.startTime)) {
        breaks.push({
          id: `break-${event.id}-${next.id}`,
          kind: 'break',
          title: 'Break',
          subtitle: `${event.endLabel} - ${next.startLabel}`,
          source: 'Hub',
          date: event.date,
          dayIndex,
          dayName: event.dayName,
          startTime: event.endTime,
          endTime: next.startTime,
          startLabel: event.endLabel,
          endLabel: next.startLabel,
          colorKey: 'cyan',
        })
      }
    })
  })
  return breaks
}

export function buildHubCalendarEvents(
  erpWorkspace: ErpWorkspace,
  lmsWorkspace: LmsWorkspace,
  examWorkspace: ExamWorkspace,
  baseDate = new Date(),
): HubCalendarEvent[] {
  const classEvents: HubCalendarEvent[] = erpWorkspace.registered_sessions.map((session, index) => {
    const sessionDate = dateForAcademicDay(session.day_index, baseDate)
    return {
      id: `class-${session.session_id}`,
      kind: 'class',
      title: session.course_code,
      subtitle: `${session.course_name} · ${session.room_name}`,
      source: 'ERP',
      date: dateIso(sessionDate),
      dayIndex: session.day_index,
      dayName: session.day,
      startTime: session.start_time,
      endTime: session.end_time,
      startLabel: session.start_label,
      endLabel: session.end_label,
      colorKey: COLOR_KEYS[index % COLOR_KEYS.length],
    }
  })

  const assignmentEvents: HubCalendarEvent[] = lmsWorkspace.assignments.map((assignment) => {
    const parts = eventDateParts(assignment.deadline_at)
    return {
      id: `assignment-${assignment.id}`,
      kind: 'assignment',
      title: assignment.title,
      subtitle: `${assignment.course_code} · ${assignment.course_name}`,
      source: 'LMS',
      date: parts.date,
      dayIndex: parts.dayIndex,
      dayName: parts.dayName,
      startTime: parts.time,
      endTime: '23:59',
      startLabel: formatClock(parts.time),
      endLabel: 'Due',
      colorKey: 'orange',
    }
  })

  const quizEvents: HubCalendarEvent[] = examWorkspace.quizzes.map((quiz) => {
    const start = eventDateParts(quiz.start_at)
    const end = eventDateParts(quiz.end_at)
    return {
      id: `quiz-${quiz.id}`,
      kind: 'quiz',
      title: quiz.title,
      subtitle: `${quiz.course_code} · ${quiz.room_name}`,
      source: 'Exam Portal',
      date: start.date,
      dayIndex: start.dayIndex,
      dayName: start.dayName,
      startTime: start.time,
      endTime: end.time,
      startLabel: formatClock(start.time),
      endLabel: formatClock(end.time),
      colorKey: 'ink',
    }
  })

  const events = [...classEvents, ...assignmentEvents, ...quizEvents]
  return [...events, ...addBreaks(classEvents)].sort((a, b) => (
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  ))
}

export function eventsForDay(events: HubCalendarEvent[], dayIndex: number, selectedDate?: Date) {
  const selectedDateIso = selectedDate ? dateIso(selectedDate) : null
  return events
    .filter((event) => {
      if (event.dayIndex !== dayIndex) return false
      if (!selectedDateIso || event.kind === 'class' || event.kind === 'break') return true
      return event.date === selectedDateIso
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}
