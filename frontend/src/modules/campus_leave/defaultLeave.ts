import type {
  CampusLeaveWorkspace,
  LeaveApplicationRecord,
  LeaveSetupConfig,
  StudentRoomProfile,
} from './types'

function isoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(days: number) {
  const value = new Date()
  value.setDate(value.getDate() + days)
  return isoDate(value)
}

export const fallbackLeaveConfig = (campusId: string): LeaveSetupConfig => ({
  campus_id: campusId,
  module_key: 'campus_leave',
  mode: 'default_app',
  source_url: 'https://campus.iiitb.net',
  is_active: true,
})

export const fallbackStudentProfiles = (campusId: string): StudentRoomProfile[] => [
  {
    campus_id: campusId,
    user_id: 'demo-student',
    student_name: 'Tahir Demo',
    email: 'tahir.demo@iiitb.ac.in',
    phone: '+91 98765 43210',
    program: 'Integrated M.Tech',
    batch: '2026',
    hostel: 'BH-1',
    room_number: 'B-312',
    guardian_name: 'Amina Demo',
    guardian_relation: 'Mother',
    guardian_email: 'amina.demo@example.com',
    guardian_phone: '+91 99887 77665',
    curfew_violations: 1,
  },
  {
    campus_id: campusId,
    user_id: 'student-ananya',
    student_name: 'Ananya Rao',
    email: 'ananya.rao@iiitb.ac.in',
    phone: '+91 90000 11111',
    program: 'M.Tech CSE',
    batch: '2025',
    hostel: 'GH-2',
    room_number: 'G-204',
    guardian_name: 'Ravi Rao',
    guardian_relation: 'Father',
    guardian_email: 'ravi.rao@example.com',
    guardian_phone: '+91 90000 22222',
    curfew_violations: 0,
  },
  {
    campus_id: campusId,
    user_id: 'student-rahul',
    student_name: 'Rahul Menon',
    email: 'rahul.menon@iiitb.ac.in',
    phone: '+91 90000 33333',
    program: 'M.Tech ECE',
    batch: '2025',
    hostel: 'BH-2',
    room_number: 'C-118',
    guardian_name: 'Leela Menon',
    guardian_relation: 'Guardian',
    guardian_email: 'leela.menon@example.com',
    guardian_phone: '+91 90000 44444',
    curfew_violations: 3,
  },
]

export const fallbackLeaveApplications = (campusId: string): LeaveApplicationRecord[] => [
  {
    id: 'leave-demo-upcoming',
    campus_id: campusId,
    user_id: 'demo-student',
    student_name: 'Tahir Demo',
    from_date: addDays(2),
    to_date: addDays(4),
    departure_time: '18:00',
    return_time: '20:30',
    leave_type: 'Home visit',
    destination: 'Bengaluru',
    reason: 'Family function',
    guardian_relation: 'Mother',
    guardian_email: 'amina.demo@example.com',
    guardian_phone: '+91 99887 77665',
    emergency_contact: '+91 98765 43210',
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  },
  {
    id: 'leave-ananya-history',
    campus_id: campusId,
    user_id: 'student-ananya',
    student_name: 'Ananya Rao',
    from_date: addDays(-5),
    to_date: addDays(-3),
    departure_time: '09:30',
    return_time: '19:30',
    leave_type: 'Medical',
    destination: 'Indiranagar',
    reason: 'Doctor appointment',
    guardian_relation: 'Father',
    guardian_email: 'ravi.rao@example.com',
    guardian_phone: '+91 90000 22222',
    emergency_contact: '+91 90000 11111',
    status: 'security_checked_in',
    submitted_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_by: 'warden-demo',
    reviewed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    security_notes: 'Returned before curfew.',
  },
]

export const fallbackLeaveWorkspace = (campusId: string, userId = 'demo-student'): CampusLeaveWorkspace => {
  const profiles = fallbackStudentProfiles(campusId)
  const applications = fallbackLeaveApplications(campusId)
  const profile = profiles.find((item) => item.user_id === userId) ?? profiles[0]

  return {
    config: fallbackLeaveConfig(campusId),
    profile,
    applications: applications.filter((application) => application.user_id === profile.user_id),
    all_applications: applications,
    student_directory: profiles,
    curfew_violations: profile.curfew_violations,
  }
}

export { addDays, isoDate }
