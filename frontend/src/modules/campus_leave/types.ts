export type LeaveModuleMode = 'external_website' | 'default_app'
export type LeaveTab = 'apply' | 'applications' | 'profile' | 'curfew' | 'security' | 'warden' | 'setup'

export interface LeaveSetupConfig {
  campus_id: string
  module_key: 'campus_leave'
  mode: LeaveModuleMode
  source_url?: string | null
  is_active: boolean
  last_synced_at?: string | null
}

export interface StudentRoomProfile {
  campus_id: string
  user_id: string
  student_name: string
  email: string
  phone: string
  program: string
  batch: string
  hostel: string
  room_number: string
  guardian_name: string
  guardian_relation: string
  guardian_email: string
  guardian_phone: string
  curfew_violations: number
}

export interface LeaveApplicationRequest {
  campus_id: string
  user_id: string
  student_name: string
  from_date: string
  to_date: string
  departure_time: string
  return_time: string
  leave_type: string
  destination: string
  reason: string
  guardian_relation: string
  guardian_email: string
  guardian_phone: string
  emergency_contact: string
}

export interface LeaveApplicationRecord extends LeaveApplicationRequest {
  id: string
  status: string
  submitted_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  security_notes?: string | null
}

export interface CampusLeaveWorkspace {
  config: LeaveSetupConfig
  profile: StudentRoomProfile
  applications: LeaveApplicationRecord[]
  all_applications: LeaveApplicationRecord[]
  student_directory: StudentRoomProfile[]
  curfew_violations: number
}
