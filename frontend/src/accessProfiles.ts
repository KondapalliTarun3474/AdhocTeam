import type { Designation, Role } from './types/campus'

export const DEFAULT_USER_ID = 'demo-student'

export interface DemoProfile {
  id: string
  label: string
  role: Role
  designations: Designation[]
}

export const DEMO_PROFILES: DemoProfile[] = [
  { id: 'student', label: 'Student', role: 'student', designations: [] },
  {
    id: 'food-committee',
    label: 'Food Committee',
    role: 'student',
    designations: ['food_committee'],
  },
  { id: 'professor', label: 'Professor', role: 'professor', designations: [] },
  {
    id: 'warden',
    label: 'Warden',
    role: 'professor',
    designations: ['warden'],
  },
  {
    id: 'ta',
    label: 'TA Student',
    role: 'student',
    designations: ['teaching_assistant'],
  },
  {
    id: 'security',
    label: 'Security',
    role: 'staff',
    designations: ['security'],
  },
  {
    id: 'classroom-support',
    label: 'Classroom Support',
    role: 'staff',
    designations: ['classroom_support'],
  },
  { id: 'admin', label: 'Admin', role: 'admin', designations: [] },
]
