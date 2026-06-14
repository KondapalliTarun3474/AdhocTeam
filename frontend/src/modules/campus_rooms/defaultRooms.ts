import type {
  CampusCourse,
  CampusRoom,
  CampusRoomsWorkspace,
  RoomBooking,
  RoomSetupConfig,
} from './types'

function isoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weekStart(value = new Date()) {
  const day = value.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const result = new Date(value)
  result.setHours(0, 0, 0, 0)
  result.setDate(value.getDate() + mondayOffset)
  return result
}

function at(day: Date, hours: number, minutes = 0) {
  const value = new Date(day)
  value.setHours(hours, minutes, 0, 0)
  return `${isoDate(value)}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}

function dayOffset(start: Date, offset: number) {
  const value = new Date(start)
  value.setDate(start.getDate() + offset)
  return value
}

export const fallbackRoomConfig = (campusId: string): RoomSetupConfig => ({
  campus_id: campusId,
  module_key: 'campus_rooms',
  mode: 'default_app',
  source_url: 'https://campus.iiitb.net',
  is_active: true,
})

export const fallbackRooms = (campusId: string): CampusRoom[] => [
  { campus_id: campusId, room_id: 'r104', room_name: 'R104', building: 'Academic Block', floor: '1', capacity: 72, room_type: 'Classroom' },
  { campus_id: campusId, room_id: 'r109', room_name: 'R109', building: 'Academic Block', floor: '1', capacity: 90, room_type: 'Seminar Room' },
  { campus_id: campusId, room_id: 'r1', room_name: 'R1', building: 'Main Block', floor: 'Ground', capacity: 45, room_type: 'Classroom' },
  { campus_id: campusId, room_id: 'r3', room_name: 'R3', building: 'Main Block', floor: 'Ground', capacity: 55, room_type: 'Classroom' },
  { campus_id: campusId, room_id: 'p2', room_name: 'P2 Lab', building: 'Lab Block', floor: '2', capacity: 60, room_type: 'Lab' },
  { campus_id: campusId, room_id: 'a3', room_name: 'A3', building: 'Admin Block', floor: '3', capacity: 35, room_type: 'Discussion Room' },
]

export const fallbackCourses = (campusId: string): CampusCourse[] => [
  {
    campus_id: campusId,
    course_id: 'ph201',
    course_code: 'PH201',
    course_name: 'Nagalakshmi S. R.',
    term: 'Summer 2026',
    professor_id: 'prof-nagalakshmi',
    professor_name: 'Prof. Nagalakshmi S. R.',
    department: 'Science',
  },
  {
    campus_id: campusId,
    course_id: 'bio901',
    course_code: 'BIO901',
    course_name: 'Imaginate Bootcamp',
    term: 'Summer 2026',
    professor_id: 'prof-kondapalli',
    professor_name: 'Prof. Kondapalli',
    department: 'Interdisciplinary',
  },
  {
    campus_id: campusId,
    course_id: 'ds501',
    course_code: 'DS501',
    course_name: 'Data Systems Studio',
    term: 'Summer 2026',
    professor_id: 'prof-asha',
    professor_name: 'Prof. Asha',
    department: 'Computer Science',
  },
  {
    campus_id: campusId,
    course_id: 'ml302',
    course_code: 'ML302',
    course_name: 'Machine Learning',
    term: 'Summer 2026',
    professor_id: 'prof-mehra',
    professor_name: 'Prof. Mehra',
    department: 'Computer Science',
  },
]

export const fallbackBookings = (campusId: string): RoomBooking[] => {
  const start = weekStart()
  const monday = dayOffset(start, 0)
  const tuesday = dayOffset(start, 1)
  const wednesday = dayOffset(start, 2)
  const saturday = dayOffset(start, 5)

  return [
    {
      id: 'seed-p2-ds501',
      campus_id: campusId,
      room_id: 'p2',
      room_name: 'P2 Lab',
      title: 'DS501 - Data Systems Studio',
      booking_type: 'class',
      start_at: at(monday, 9),
      end_at: at(monday, 17),
      status: 'confirmed',
      course_id: 'ds501',
      course_code: 'DS501',
      course_name: 'Data Systems Studio',
      professor_id: 'prof-asha',
      professor_name: 'Prof. Asha',
    },
    {
      id: 'seed-r1-ml302',
      campus_id: campusId,
      room_id: 'r1',
      room_name: 'R1',
      title: 'ML302 - Machine Learning',
      booking_type: 'class',
      start_at: at(monday, 11),
      end_at: at(monday, 13),
      status: 'confirmed',
      course_id: 'ml302',
      course_code: 'ML302',
      course_name: 'Machine Learning',
      professor_id: 'prof-mehra',
      professor_name: 'Prof. Mehra',
    },
    {
      id: 'seed-r104-ph201',
      campus_id: campusId,
      room_id: 'r104',
      room_name: 'R104',
      title: 'R104 - Thesis Oral Exam',
      booking_type: 'class',
      start_at: at(tuesday, 12, 30),
      end_at: at(tuesday, 16),
      status: 'confirmed',
      course_id: 'ph201',
      course_code: 'PH201',
      course_name: 'Nagalakshmi S. R.',
      professor_id: 'prof-nagalakshmi',
      professor_name: 'Prof. Nagalakshmi S. R.',
    },
    {
      id: 'seed-a3-block',
      campus_id: campusId,
      room_id: 'a3',
      room_name: 'A3',
      title: 'Classroom maintenance block',
      booking_type: 'block',
      start_at: at(wednesday, 9),
      end_at: at(wednesday, 10),
      status: 'blocked',
      notes: 'Projector repair',
    },
    {
      id: 'seed-r109-bio901',
      campus_id: campusId,
      room_id: 'r109',
      room_name: 'R109',
      title: 'R109 - Imaginate Bootcamp',
      booking_type: 'event',
      start_at: at(saturday, 10),
      end_at: at(saturday, 17),
      status: 'confirmed',
      course_id: 'bio901',
      course_code: 'BIO901',
      course_name: 'Imaginate Bootcamp',
      professor_id: 'prof-kondapalli',
      professor_name: 'Prof. Kondapalli',
    },
  ]
}

export const fallbackRoomsWorkspace = (campusId: string): CampusRoomsWorkspace => {
  const bookings = fallbackBookings(campusId)
  const now = Date.now()
  const nextBooking = bookings
    .filter((booking) => new Date(booking.end_at).getTime() >= now)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))[0] ?? bookings[0]

  return {
    config: fallbackRoomConfig(campusId),
    rooms: fallbackRooms(campusId),
    courses: fallbackCourses(campusId),
    bookings,
    next_booking: nextBooking,
  }
}

export { isoDate, weekStart }
