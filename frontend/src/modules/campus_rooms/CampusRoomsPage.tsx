import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import {
  createRoomBooking,
  fetchRoomsWorkspace,
  saveRoomConfig,
  updateRoomBookingStatus,
} from './api'
import { fallbackRoomsWorkspace, isoDate, weekStart } from './defaultRooms'
import type {
  CalendarScope,
  CalendarViewBy,
  CampusRoomsWorkspace,
  RoomBooking,
  RoomBookingRequest,
  RoomSetupConfig,
  RoomsTab,
} from './types'
import './CampusRooms.css'

const DAY_START_MINUTE = 8 * 60
const DAY_END_MINUTE = 18 * 60
const DAY_TOTAL_MINUTES = DAY_END_MINUTE - DAY_START_MINUTE

interface BookingDraft {
  bookingType: RoomBookingRequest['booking_type']
  roomId: string
  courseId: string
  title: string
  date: string
  startTime: string
  endTime: string
  professorName: string
  notes: string
}

function normalizeExternalUrl(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function dateTimeInput(date: string, time: string) {
  return `${date}T${time}`
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatDay(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(value)
}

function formatRange(startAt: string, endAt: string) {
  const start = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startAt))
  const end = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(endAt))
  return `${start} - ${end}`
}

function minutesFor(value: string) {
  const date = new Date(value)
  return (date.getHours() * 60) + date.getMinutes()
}

function bookingPosition(booking: RoomBooking): CSSProperties {
  const start = Math.max(minutesFor(booking.start_at), DAY_START_MINUTE)
  const end = Math.min(minutesFor(booking.end_at), DAY_END_MINUTE)
  const top = ((start - DAY_START_MINUTE) / DAY_TOTAL_MINUTES) * 100
  const height = Math.max(((end - start) / DAY_TOTAL_MINUTES) * 100, 5)

  return {
    top: `${Math.max(top, 0)}%`,
    height: `${height}%`,
  }
}

function daysForWeek(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(start)
    value.setDate(start.getDate() + index)
    return value
  })
}

function filterOptions(workspace: CampusRoomsWorkspace, viewBy: CalendarViewBy) {
  if (viewBy === 'faculty') {
    return Array.from(new Set(
      workspace.bookings
        .map((booking) => booking.professor_name)
        .filter((value): value is string => Boolean(value)),
    ))
  }

  if (viewBy === 'course') {
    return workspace.courses.map((course) => course.course_id)
  }

  if (viewBy === 'room') {
    return workspace.rooms.map((room) => room.room_id)
  }

  return []
}

function CampusRoomsPage({
  campusId,
  designations,
  role,
  userId,
}: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<CampusRoomsWorkspace>(() => fallbackRoomsWorkspace(campusId))
  const [configDraft, setConfigDraft] = useState<RoomSetupConfig>(() => fallbackRoomsWorkspace(campusId).config)
  const [activeTab, setActiveTab] = useState<RoomsTab>('calendar')
  const [viewBy, setViewBy] = useState<CalendarViewBy>('all')
  const [viewValue, setViewValue] = useState('')
  const [scope, setScope] = useState<CalendarScope>('week')
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => weekStart())
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [status, setStatus] = useState('')
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(() => ({
    bookingType: 'class',
    roomId: fallbackRoomsWorkspace(campusId).rooms[0]?.room_id ?? '',
    courseId: fallbackRoomsWorkspace(campusId).courses[0]?.course_id ?? '',
    title: '',
    date: isoDate(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    professorName: '',
    notes: '',
  }))

  const canManage = role === 'admin' || designations.includes('classroom_support')
  const canConfigure = role === 'admin'
  const externalUrl = normalizeExternalUrl(configDraft.source_url)

  useEffect(() => {
    let ignore = false
    fetchRoomsWorkspace(campusId, role, designations).then((data) => {
      if (!ignore) {
        setWorkspace(data)
        setConfigDraft(data.config)
        setBookingDraft((current) => ({
          ...current,
          roomId: data.rooms[0]?.room_id ?? current.roomId,
          courseId: data.courses[0]?.course_id ?? current.courseId,
        }))
      }
    })

    return () => {
      ignore = true
    }
  }, [campusId, role, designations])

  const tabs = useMemo(() => ([
    { id: 'calendar' as const, label: 'Calendar' },
    { id: 'rooms' as const, label: 'Rooms' },
    { id: 'courses' as const, label: 'Courses' },
    ...(canManage ? [{ id: 'support' as const, label: 'Classroom Support' }] : []),
    ...(canConfigure ? [{ id: 'setup' as const, label: 'Setup' }] : []),
  ]), [canManage, canConfigure])

  const availableFilterOptions = useMemo(
    () => filterOptions(workspace, viewBy),
    [workspace, viewBy],
  )

  useEffect(() => {
    if (viewBy === 'all') {
      setViewValue('')
      return
    }
    if (!availableFilterOptions.includes(viewValue)) {
      setViewValue(availableFilterOptions[0] ?? '')
    }
  }, [availableFilterOptions, viewBy, viewValue])

  const visibleDays = useMemo(() => {
    const days = daysForWeek(weekAnchor)
    return scope === 'day'
      ? [days[selectedDayIndex] ?? days[0]]
      : days
  }, [scope, selectedDayIndex, weekAnchor])

  const visibleBookings = useMemo(() => {
    const visibleDates = new Set(visibleDays.map((day) => isoDate(day)))
    return workspace.bookings.filter((booking) => {
      const matchesDay = visibleDates.has(booking.start_at.slice(0, 10))
      if (!matchesDay) return false
      if (viewBy === 'faculty') return !viewValue || booking.professor_name === viewValue
      if (viewBy === 'course') return !viewValue || booking.course_id === viewValue
      if (viewBy === 'room') return !viewValue || booking.room_id === viewValue
      return true
    })
  }, [workspace.bookings, visibleDays, viewBy, viewValue])

  const selectedCourse = workspace.courses.find((course) => course.course_id === bookingDraft.courseId)
  const selectedRoom = workspace.rooms.find((room) => room.room_id === bookingDraft.roomId)

  const handleConfigSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canConfigure) return

    setStatus('Saving room module setup...')
    const response = await saveRoomConfig(configDraft, role, designations)
    setWorkspace((current) => ({
      ...current,
      config: response.data ?? configDraft,
    }))
    setStatus(response.status === 'preview' ? 'Room setup previewed locally.' : 'Room setup saved.')
  }

  const handleBookingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage || !bookingDraft.roomId) return

    const title = bookingDraft.title.trim()
      || (selectedCourse ? `${selectedCourse.course_code} - ${selectedCourse.course_name}` : 'Room booking')
    const request: RoomBookingRequest = {
      campus_id: campusId,
      room_id: bookingDraft.roomId,
      title,
      booking_type: bookingDraft.bookingType,
      start_at: dateTimeInput(bookingDraft.date, bookingDraft.startTime),
      end_at: dateTimeInput(bookingDraft.date, bookingDraft.endTime),
      course_id: bookingDraft.bookingType === 'class' ? bookingDraft.courseId : null,
      professor_id: selectedCourse?.professor_id,
      professor_name: selectedCourse?.professor_name ?? bookingDraft.professorName,
      created_by: userId,
      notes: bookingDraft.notes,
    }

    if (request.start_at >= request.end_at) {
      setStatus('End time must be after start time.')
      return
    }

    setStatus(bookingDraft.bookingType === 'block' ? 'Blocking room...' : 'Saving booking...')
    const response = await createRoomBooking(request, role, designations)
    const savedBooking: RoomBooking = {
      ...request,
      id: response.data?.id ?? `local-${Date.now()}`,
      room_name: response.data?.room_name ?? selectedRoom?.room_name ?? bookingDraft.roomId.toUpperCase(),
      status: response.data?.status ?? (bookingDraft.bookingType === 'block' ? 'blocked' : 'confirmed'),
      course_code: response.data?.course_code ?? selectedCourse?.course_code,
      course_name: response.data?.course_name ?? selectedCourse?.course_name,
      professor_name: response.data?.professor_name ?? selectedCourse?.professor_name ?? bookingDraft.professorName,
    }
    setWorkspace((current) => ({
      ...current,
      bookings: [...current.bookings, savedBooking].sort((a, b) => a.start_at.localeCompare(b.start_at)),
      next_booking: current.next_booking ?? savedBooking,
    }))
    setStatus(response.status === 'preview' ? 'Booking previewed locally.' : 'Booking saved.')
  }

  const markBooking = async (booking: RoomBooking, nextStatus: string) => {
    if (!canManage) return
    const response = await updateRoomBookingStatus(
      campusId,
      booking.id,
      nextStatus,
      booking.notes ?? '',
      role,
      designations,
    )
    setWorkspace((current) => ({
      ...current,
      bookings: current.bookings.map((item) => (
        item.id === booking.id
          ? { ...item, status: response.data?.status ?? nextStatus }
          : item
      )),
    }))
    setStatus(response.status === 'preview' ? 'Status previewed locally.' : 'Status updated.')
  }

  const moveWeek = (direction: -1 | 1) => {
    setWeekAnchor((current) => {
      const next = new Date(current)
      next.setDate(current.getDate() + (direction * 7))
      return next
    })
  }

  const resetToday = () => {
    const today = new Date()
    const start = weekStart(today)
    setWeekAnchor(start)
    setSelectedDayIndex(daysForWeek(start).findIndex((day) => isoDate(day) === isoDate(today)))
  }

  const renderSetup = () => (
    <form className="rooms-setup" onSubmit={handleConfigSave}>
      <div className="rooms-section-heading">
        <div>
          <span>Module Setup</span>
          <h3>Room Tracker Source</h3>
        </div>
        <strong>{configDraft.mode === 'default_app' ? 'Default App' : 'Website'}</strong>
      </div>

      <div className="rooms-button-row" role="group" aria-label="Room tracker source">
        <button
          className={configDraft.mode === 'external_website' ? 'active' : ''}
          onClick={() => setConfigDraft((current) => ({ ...current, mode: 'external_website' }))}
          type="button"
        >
          Add a website
        </button>
        <button
          className={configDraft.mode === 'default_app' ? 'active' : ''}
          onClick={() => setConfigDraft((current) => ({ ...current, mode: 'default_app' }))}
          type="button"
        >
          Add Default App
        </button>
      </div>

      <label>
        Website
        <input
          onChange={(event) => setConfigDraft((current) => ({ ...current, source_url: event.target.value }))}
          placeholder="campus.iiitb.net"
          type="text"
          value={configDraft.source_url ?? ''}
        />
      </label>

      <label className="rooms-toggle">
        <input
          checked={configDraft.is_active}
          onChange={(event) => setConfigDraft((current) => ({ ...current, is_active: event.target.checked }))}
          type="checkbox"
        />
        Active
      </label>

      <button type="submit">Save Setup</button>
    </form>
  )

  const renderExternal = () => (
    <section className="rooms-external">
      <div>
        <span>Website Source</span>
        <h3>{configDraft.source_url || 'campus.iiitb.net'}</h3>
      </div>
      {externalUrl && (
        <a href={externalUrl} rel="noreferrer" target="_blank">
          Open Website
        </a>
      )}
    </section>
  )

  const renderCalendar = () => {
    const dayLabels = daysForWeek(weekAnchor)
    return (
      <div className="rooms-calendar-panel">
        <section className="rooms-calendar-toolbar">
          <div className="rooms-view-by" aria-label="Calendar view by">
            <strong>View by</strong>
            {(['all', 'faculty', 'course', 'room'] as CalendarViewBy[]).map((option) => (
              <label key={option}>
                <input
                  checked={viewBy === option}
                  onChange={() => setViewBy(option)}
                  type="radio"
                />
                {titleCase(option)}
              </label>
            ))}
          </div>

          {viewBy !== 'all' && (
            <select
              aria-label={`Select ${viewBy}`}
              onChange={(event) => setViewValue(event.target.value)}
              value={viewValue}
            >
              {availableFilterOptions.map((option) => {
                const course = workspace.courses.find((item) => item.course_id === option)
                const room = workspace.rooms.find((item) => item.room_id === option)
                return (
                  <option key={option} value={option}>
                    {course ? `${course.course_code} - ${course.course_name}` : room?.room_name ?? option}
                  </option>
                )
              })}
            </select>
          )}
        </section>

        <section className="rooms-calendar-actions">
          <div className="rooms-button-row" role="group" aria-label="Calendar scope">
            <button className={scope === 'week' ? 'active' : ''} onClick={() => setScope('week')} type="button">Week</button>
            <button className={scope === 'day' ? 'active' : ''} onClick={() => setScope('day')} type="button">Day</button>
          </div>
          <strong>{formatDay(dayLabels[0])} - {formatDay(dayLabels[6])}</strong>
          <div className="rooms-button-row" role="group" aria-label="Calendar navigation">
            <button onClick={() => moveWeek(-1)} type="button">Previous</button>
            <button onClick={resetToday} type="button">Today</button>
            <button onClick={() => moveWeek(1)} type="button">Next</button>
          </div>
        </section>

        {scope === 'day' && (
          <div className="rooms-day-switcher" role="group" aria-label="Choose day">
            {dayLabels.map((day, index) => (
              <button
                className={selectedDayIndex === index ? 'active' : ''}
                key={isoDate(day)}
                onClick={() => setSelectedDayIndex(index)}
                type="button"
              >
                {formatDay(day)}
              </button>
            ))}
          </div>
        )}

        <div
          className="rooms-calendar-grid"
          style={{ gridTemplateColumns: `64px repeat(${visibleDays.length}, minmax(135px, 1fr))` }}
        >
          <div className="rooms-time-axis" aria-hidden="true">
            {Array.from({ length: 11 }, (_, index) => (
              <span key={index}>{index + 8}:00</span>
            ))}
          </div>

          {visibleDays.map((day) => {
            const dayKey = isoDate(day)
            const dayBookings = visibleBookings.filter((booking) => booking.start_at.slice(0, 10) === dayKey)
            return (
              <section className="rooms-day-column" key={dayKey}>
                <header>
                  <strong>{new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(day)}</strong>
                  <span>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(day)}</span>
                </header>
                <div className="rooms-day-lane">
                  {dayBookings.map((booking) => (
                    <article
                      className={`rooms-booking-block ${booking.booking_type}`}
                      key={booking.id}
                      style={bookingPosition(booking)}
                      title={`${booking.room_name} ${formatRange(booking.start_at, booking.end_at)}`}
                    >
                      <strong>{booking.room_name}</strong>
                      <span>{booking.title}</span>
                      <em>{formatRange(booking.start_at, booking.end_at)}</em>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  const renderRooms = () => (
    <div className="rooms-card-grid">
      {workspace.rooms.map((room) => (
        <article className="rooms-data-card" key={room.room_id}>
          <span>{room.room_type}</span>
          <h3>{room.room_name}</h3>
          <p>{room.building}, Floor {room.floor}</p>
          <strong>{room.capacity} seats</strong>
        </article>
      ))}
    </div>
  )

  const renderCourses = () => (
    <div className="rooms-table-panel">
      <table>
        <thead>
          <tr>
            <th>Course</th>
            <th>Name</th>
            <th>Professor</th>
            <th>Term</th>
          </tr>
        </thead>
        <tbody>
          {workspace.courses.map((course) => (
            <tr key={course.course_id}>
              <td>{course.course_code}</td>
              <td>{course.course_name}</td>
              <td>{course.professor_name}</td>
              <td>{course.term}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderSupport = () => (
    <div className="rooms-two-column">
      <form className="rooms-form" onSubmit={handleBookingSubmit}>
        <div className="rooms-section-heading">
          <div>
            <span>Classroom Support</span>
            <h3>Book or Block Room</h3>
          </div>
        </div>

        <label>
          Type
          <select
            onChange={(event) => setBookingDraft((current) => ({
              ...current,
              bookingType: event.target.value as BookingDraft['bookingType'],
            }))}
            value={bookingDraft.bookingType}
          >
            <option value="class">Class</option>
            <option value="event">Event</option>
            <option value="block">Block</option>
          </select>
        </label>

        <label>
          Room
          <select
            onChange={(event) => setBookingDraft((current) => ({ ...current, roomId: event.target.value }))}
            value={bookingDraft.roomId}
          >
            {workspace.rooms.map((room) => (
              <option key={room.room_id} value={room.room_id}>{room.room_name}</option>
            ))}
          </select>
        </label>

        {bookingDraft.bookingType === 'class' && (
          <label>
            Course
            <select
              onChange={(event) => setBookingDraft((current) => ({ ...current, courseId: event.target.value }))}
              value={bookingDraft.courseId}
            >
              {workspace.courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_code} - {course.course_name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Title
          <input
            onChange={(event) => setBookingDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder={selectedCourse ? `${selectedCourse.course_code} - ${selectedCourse.course_name}` : 'Room booking'}
            type="text"
            value={bookingDraft.title}
          />
        </label>

        {bookingDraft.bookingType !== 'class' && (
          <label>
            Faculty or Owner
            <input
              onChange={(event) => setBookingDraft((current) => ({ ...current, professorName: event.target.value }))}
              type="text"
              value={bookingDraft.professorName}
            />
          </label>
        )}

        <div className="rooms-form-grid">
          <label>
            Date
            <input
              onChange={(event) => setBookingDraft((current) => ({ ...current, date: event.target.value }))}
              type="date"
              value={bookingDraft.date}
            />
          </label>
          <label>
            Start
            <input
              onChange={(event) => setBookingDraft((current) => ({ ...current, startTime: event.target.value }))}
              type="time"
              value={bookingDraft.startTime}
            />
          </label>
          <label>
            End
            <input
              onChange={(event) => setBookingDraft((current) => ({ ...current, endTime: event.target.value }))}
              type="time"
              value={bookingDraft.endTime}
            />
          </label>
        </div>

        <label>
          Notes
          <textarea
            onChange={(event) => setBookingDraft((current) => ({ ...current, notes: event.target.value }))}
            rows={3}
            value={bookingDraft.notes}
          />
        </label>

        <button type="submit">Save Booking</button>
      </form>

      <section className="rooms-list-panel">
        <div className="rooms-section-heading">
          <div>
            <span>Queue</span>
            <h3>Upcoming Support Entries</h3>
          </div>
        </div>
        <div className="rooms-compact-list">
          {workspace.bookings.slice(0, 8).map((booking) => (
            <article key={booking.id}>
              <div>
                <strong>{booking.room_name} - {booking.title}</strong>
                <span>{formatRange(booking.start_at, booking.end_at)} · {titleCase(booking.status)}</span>
              </div>
              <button onClick={() => markBooking(booking, 'cancelled')} type="button">
                Cancel
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )

  const renderActiveTab = () => {
    if (activeTab === 'calendar') return renderCalendar()
    if (activeTab === 'rooms') return renderRooms()
    if (activeTab === 'courses') return renderCourses()
    if (activeTab === 'support') return renderSupport()
    return renderSetup()
  }

  return (
    <section className="rooms-panel">
      <header className="rooms-header">
        <div>
          <span>Campus Portal</span>
          <h2>Campus Room Tracker</h2>
        </div>
        <div className="rooms-header-meta">
          <strong>{workspace.bookings.length} bookings</strong>
          <em>{configDraft.mode === 'default_app' ? 'Default app' : 'Website source'}</em>
        </div>
      </header>

      {renderExternal()}

      <div className="rooms-tabs" role="tablist" aria-label="Campus room tracker tabs">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'active' : ''}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rooms-tab-body">
        {renderActiveTab()}
      </div>

      {status && <p className="rooms-status">{status}</p>}
    </section>
  )
}

export default CampusRoomsPage
