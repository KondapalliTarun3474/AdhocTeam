import type { ComponentType } from 'react'

export type Role =
  | 'student'
  | 'professor'
  | 'staff'
  | 'admin'

export type Designation =
  | 'food_committee'
  | 'teaching_assistant'
  | 'warden'
  | 'security'
  | 'classroom_support'

export type ModuleStatus = 'connected' | 'planned' | 'disabled'
export type Priority = 'high' | 'normal' | 'low'
export type ModuleKey = string

export interface Meal {
  meal_type: string
  items: string[]
}

export interface MenuDay {
  campus_id: string
  date: string
  meals: Meal[]
}

export interface HubNotification {
  id: string
  module_key: ModuleKey
  title: string
  body: string
  priority: Priority
}

export interface HubUpdate {
  module_key: ModuleKey
  title: string
  body: string
}

export interface CalendarItem {
  time: string
  title: string
  module_key: ModuleKey
}

export interface ModuleSummary {
  key: ModuleKey
  name: string
  status: ModuleStatus
  summary: string
  available: boolean
  roles?: Role[]
  designations?: Designation[]
}

export interface HubOverview {
  campus_id: string
  user_id: string
  role: Role
  designations?: Designation[]
  date: string
  notifications: HubNotification[]
  updates: HubUpdate[]
  calendar: CalendarItem[]
  modules: ModuleSummary[]
  menu?: MenuDay
  module_data?: Record<ModuleKey, unknown>
}

export interface MenuReview {
  campus_id: string
  user_id: string
  date: string
  meal_type: string
  dish_name: string
  rating: number
  comment?: string
}

export interface ApiStatus<T> {
  status: 'success' | 'preview' | 'error'
  data?: T
  message?: string
}

export interface AssistantResponse {
  reply: string
}

export interface ModuleWidgetProps {
  campusId: string
  designations: Designation[]
  isLoading: boolean
  openModule?: (moduleKey: ModuleKey) => void
  overview: HubOverview | null
  role: Role
  userId: string
}

export interface FrontendModuleManifest {
  key: ModuleKey
  name: string
  summary: string
  status: ModuleStatus
  roles: Role[]
  designations?: Designation[]
  Page?: ComponentType<ModuleWidgetProps>
  Widget?: ComponentType<ModuleWidgetProps>
}
