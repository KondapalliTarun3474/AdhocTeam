export type AnnouncementPriority = 'high' | 'normal' | 'low'

export interface AnnouncementRecord {
  id: string
  campus_id: string
  title: string
  body: string
  category: string
  tag: string
  course_id?: string | null
  course_code?: string | null
  course_name?: string | null
  created_by: string
  created_by_name: string
  audience: string
  priority: AnnouncementPriority
  created_at: string
}

export interface AnnouncementCreateRequest {
  campus_id: string
  title: string
  body: string
  category: string
  tag: string
  created_by: string
  created_by_name: string
  audience: string
  course_id?: string | null
  priority: AnnouncementPriority
}

export interface AnnouncementsWorkspace {
  campus_id: string
  announcements: AnnouncementRecord[]
  categories: string[]
  tags: string[]
}
