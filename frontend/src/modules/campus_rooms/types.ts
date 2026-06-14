export type RoomModuleMode = 'external_website' | 'default_app'
export type RoomBookingType = 'class' | 'event' | 'block'
export type RoomsTab = 'calendar' | 'rooms' | 'courses' | 'support' | 'setup'
export type CalendarViewBy = 'all' | 'faculty' | 'course' | 'room'
export type CalendarScope = 'week' | 'day'

export interface RoomSetupConfig {
  campus_id: string
  module_key: 'campus_rooms'
  mode: RoomModuleMode
  source_url?: string | null
  is_active: boolean
  last_synced_at?: string | null
}

export interface CampusCourse {
  campus_id: string
  course_id: string
  course_code: string
  course_name: string
  term: string
  professor_id: string
  professor_name: string
  department?: string | null
}

export interface CampusRoom {
  campus_id: string
  room_id: string
  room_name: string
  building: string
  floor: string
  capacity: number
  room_type: string
}

export interface RoomBooking {
  id: string
  campus_id: string
  room_id: string
  room_name: string
  title: string
  booking_type: RoomBookingType
  start_at: string
  end_at: string
  status: string
  course_id?: string | null
  course_code?: string | null
  course_name?: string | null
  professor_id?: string | null
  professor_name?: string | null
  created_by?: string | null
  notes?: string | null
}

export interface RoomBookingRequest {
  campus_id: string
  room_id: string
  title: string
  booking_type: RoomBookingType
  start_at: string
  end_at: string
  course_id?: string | null
  professor_id?: string | null
  professor_name?: string | null
  created_by?: string | null
  notes?: string | null
}

export interface CampusRoomsWorkspace {
  config: RoomSetupConfig
  rooms: CampusRoom[]
  courses: CampusCourse[]
  bookings: RoomBooking[]
  next_booking?: RoomBooking | null
}
