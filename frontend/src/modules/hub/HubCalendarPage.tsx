import { useEffect, useMemo, useState } from 'react'
import type { DemoProfile } from '../../accessProfiles'
import { DEFAULT_USER_ID } from '../../accessProfiles'
import { DEFAULT_CAMPUS_ID, fetchHubOverview } from '../../api/client'
import type { ModuleKey } from '../../types/campus'
import { fetchErpWorkspace, fallbackErpWorkspace } from '../erp/api'
import type { ErpWorkspace } from '../erp/types'
import { fetchExamWorkspace, fallbackExamWorkspace } from '../exam_lms/api'
import type { ExamWorkspace } from '../exam_lms/types'
import { fetchLmsWorkspace, fallbackLmsWorkspace } from '../lms/api'
import type { LmsWorkspace } from '../lms/types'
import {
  ACADEMIC_DAYS,
  type HubCalendarEvent,
  type HubCalendarMode,
  academicDayIndexForDate,
  buildHubCalendarEvents,
  dateForAcademicDay,
  eventsForDay,
} from './hubCalendar'
import './HubCalendarPage.css'

interface HubCalendarPageProps {
  activeProfile: DemoProfile
  onOpenModule: (moduleKey: ModuleKey) => void
}

const MODE_LABELS: Array<{ key: HubCalendarMode; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'agenda', label: 'Agenda' },
]

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(value)
}

function eventClassName(event: HubCalendarEvent) {
  return `hub-calendar-event ${event.kind} ${event.colorKey}`
}

function HubCalendarPage({ activeProfile, onOpenModule }: HubCalendarPageProps) {
  const [mode, setMode] = useState<HubCalendarMode>('week')
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => academicDayIndexForDate(new Date()))
  const [erpWorkspace, setErpWorkspace] = useState<ErpWorkspace>(() => fallbackErpWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID))
  const [lmsWorkspace, setLmsWorkspace] = useState<LmsWorkspace>(() => fallbackLmsWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID))
  const [examWorkspace, setExamWorkspace] = useState<ExamWorkspace>(() => fallbackExamWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    setIsLoading(true)

    Promise.all([
      fetchHubOverview({
        campusId: DEFAULT_CAMPUS_ID,
        userId: DEFAULT_USER_ID,
        role: activeProfile.role,
        designations: activeProfile.designations,
      }),
      fetchErpWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID, activeProfile.role, activeProfile.designations),
      fetchLmsWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID, activeProfile.role, activeProfile.designations),
      fetchExamWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID, activeProfile.role, activeProfile.designations),
    ]).then(([, erp, lms, exam]) => {
      if (!ignore) {
        setErpWorkspace(erp)
        setLmsWorkspace(lms)
        setExamWorkspace(exam)
        setIsLoading(false)
      }
    })

    return () => {
      ignore = true
    }
  }, [activeProfile])

  const events = useMemo(() => (
    buildHubCalendarEvents(erpWorkspace, lmsWorkspace, examWorkspace)
  ), [erpWorkspace, lmsWorkspace, examWorkspace])

  const selectedEvents = useMemo(() => (
    eventsForDay(events, selectedDayIndex, dateForAcademicDay(selectedDayIndex))
  ), [events, selectedDayIndex])

  const counts = useMemo(() => ({
    classes: events.filter((event) => event.kind === 'class').length,
    assignments: events.filter((event) => event.kind === 'assignment').length,
    quizzes: events.filter((event) => event.kind === 'quiz').length,
  }), [events])

  return (
    <section className="hub-calendar-page">
      <header className="hub-calendar-page-header">
        <div>
          <span>Hub Calendar</span>
          <h1>Student Schedule</h1>
        </div>
        <div className="hub-calendar-mode" aria-label="Calendar view">
          {MODE_LABELS.map((item) => (
            <button
              className={mode === item.key ? 'active' : ''}
              key={item.key}
              onClick={() => setMode(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="hub-calendar-summary" aria-label="Calendar summary">
        <button onClick={() => onOpenModule('erp')} type="button">
          <span>Classes</span>
          <strong>{counts.classes}</strong>
        </button>
        <button onClick={() => onOpenModule('lms')} type="button">
          <span>Assignments</span>
          <strong>{counts.assignments}</strong>
        </button>
        <button onClick={() => onOpenModule('exam_lms')} type="button">
          <span>Quizzes</span>
          <strong>{counts.quizzes}</strong>
        </button>
      </section>

      <section className="hub-calendar-day-strip" aria-label="Academic week">
        {ACADEMIC_DAYS.map((day, dayIndex) => (
          <button
            className={selectedDayIndex === dayIndex ? 'active' : ''}
            key={day}
            onClick={() => {
              setSelectedDayIndex(dayIndex)
              setMode('day')
            }}
            type="button"
          >
            <span>{day}</span>
            <strong>{formatDate(dateForAcademicDay(dayIndex))}</strong>
          </button>
        ))}
      </section>

      {mode === 'day' && (
        <section className="hub-calendar-day-view" aria-label="Daily calendar">
          <header className="hub-calendar-day-heading">
            <div>
              <span>Daily Calendar</span>
              <strong>{ACADEMIC_DAYS[selectedDayIndex]} · {formatDate(dateForAcademicDay(selectedDayIndex))}</strong>
            </div>
            <em>{selectedEvents.length} items</em>
          </header>
          <div className="hub-calendar-day-list">
            {selectedEvents.length === 0 && (
              <p className="hub-calendar-empty">No scheduled items for this day.</p>
            )}
            {selectedEvents.map((event) => (
              <article
                className={eventClassName(event)}
                key={event.id}
              >
                <time>{event.startLabel} - {event.endLabel}</time>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.subtitle}</p>
                </div>
                <span>{event.source}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {mode === 'week' && (
        <section className="hub-calendar-week-view" aria-label="Weekly calendar">
          {ACADEMIC_DAYS.map((day, dayIndex) => {
            const dayEvents = eventsForDay(events, dayIndex, dateForAcademicDay(dayIndex))
            return (
              <article className="hub-calendar-week-column" key={day}>
                <header>
                  <span>{day}</span>
                  <strong>{formatDate(dateForAcademicDay(dayIndex))}</strong>
                </header>
                <div>
                  {dayEvents.length === 0 && <p>No items</p>}
                  {dayEvents.map((event) => (
                    <button
                      className={eventClassName(event)}
                      key={event.id}
                      onClick={() => {
                        setSelectedDayIndex(dayIndex)
                        setMode('day')
                      }}
                      type="button"
                    >
                      <span>{event.startLabel}</span>
                      <strong>{event.title}</strong>
                      <em>{event.subtitle}</em>
                    </button>
                  ))}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {mode === 'agenda' && (
        <section className="hub-calendar-agenda" aria-label="Agenda">
          {events.map((event) => (
            <article className={eventClassName(event)} key={event.id}>
              <time>{event.dayName} · {event.startLabel} - {event.endLabel}</time>
              <div>
                <strong>{event.title}</strong>
                <p>{event.subtitle}</p>
              </div>
              <span>{event.source}</span>
            </article>
          ))}
        </section>
      )}

      {isLoading && <p className="hub-calendar-status">Refreshing calendar...</p>}
    </section>
  )
}

export default HubCalendarPage
