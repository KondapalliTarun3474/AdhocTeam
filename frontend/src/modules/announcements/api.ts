import { API_BASE, DEFAULT_CAMPUS_ID } from '../../api/client'
import type { ApiStatus, Designation, Role } from '../../types/campus'
import { DEFAULT_REGISTERED_COURSE_IDS, fallbackCourses } from '../academics/catalog'
import type {
  AnnouncementCreateRequest,
  AnnouncementRecord,
  AnnouncementsWorkspace,
} from './types'

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  role: Role
  designations: Designation[]
}

export interface AnnouncementFilters {
  category?: string
  tag?: string
  courseId?: string
}

const FALLBACK_CATEGORIES = ['Courses', 'Hackathons', 'Volunteering', 'Events', 'Placements', 'Resources']
const FALLBACK_TAGS = ['Assignment', 'Quiz', 'Results', 'Hackathon', 'Volunteering', 'Event', 'Placement', 'Resource']

function recentIso(hoursAgo: number) {
  const value = new Date()
  value.setHours(value.getHours() - hoursAgo)
  return value.toISOString()
}

export function fallbackAnnouncements(campusId = DEFAULT_CAMPUS_ID): AnnouncementRecord[] {
  const courses = fallbackCourses(campusId).filter((course) => (
    DEFAULT_REGISTERED_COURSE_IDS.includes(course.course_id)
  ))
  const courseNotices: AnnouncementRecord[] = courses.slice(0, 3).map((course, index) => {
    const variants = [
      ['New Assignment', 'Assignment 1 is available in LMS.', 'Assignment', 'high'],
      ['Quiz Scheduled', 'Quiz 1 has been scheduled in the Exam Portal.', 'Quiz', 'high'],
      ['Results Released', 'Quiz scores are now available for review.', 'Results', 'normal'],
    ] as const
    const [title, body, tag, priority] = variants[index]
    return {
      id: `local-ann-${tag.toLowerCase()}-${course.course_id}`,
      campus_id: campusId,
      title: `${course.course_code}: ${title}`,
      body,
      category: 'Courses',
      tag,
      course_id: course.course_id,
      course_code: course.course_code,
      course_name: course.course_name,
      created_by: course.professor_id,
      created_by_name: course.professor_name,
      audience: 'students',
      priority,
      created_at: recentIso(index + 1),
    }
  })

  return [
    ...courseNotices,
    {
      id: 'local-ann-hackathon',
      campus_id: campusId,
      title: 'Oracle Hackathon Prep Session',
      body: 'Campus-wide prep session for product demos and pitch refinement.',
      category: 'Hackathons',
      tag: 'Hackathon',
      created_by: 'prof-campus',
      created_by_name: 'Faculty Coordinator',
      audience: 'campus',
      priority: 'high',
      created_at: recentIso(5),
    },
    {
      id: 'local-ann-placement',
      campus_id: campusId,
      title: 'Placement Opportunity: Product Engineering Internships',
      body: 'Students interested in product engineering roles should update ERP preferences.',
      category: 'Placements',
      tag: 'Placement',
      created_by: 'prof-placement',
      created_by_name: 'Placement Office',
      audience: 'campus',
      priority: 'normal',
      created_at: recentIso(8),
    },
    {
      id: 'local-ann-resource',
      campus_id: campusId,
      title: 'Resource Pack: Research Writing Templates',
      body: 'Templates and guides are available for proposals and research reports.',
      category: 'Resources',
      tag: 'Resource',
      created_by: 'prof-resource',
      created_by_name: 'Academic Office',
      audience: 'campus',
      priority: 'low',
      created_at: recentIso(11),
    },
  ]
}

export function fallbackAnnouncementsWorkspace(
  campusId = DEFAULT_CAMPUS_ID,
  filters: AnnouncementFilters = {},
): AnnouncementsWorkspace {
  const announcements = fallbackAnnouncements(campusId).filter((item) => (
    (!filters.category || item.category === filters.category)
    && (!filters.tag || item.tag === filters.tag)
    && (!filters.courseId || item.course_id === filters.courseId)
  ))

  return {
    campus_id: campusId,
    announcements,
    categories: FALLBACK_CATEGORIES,
    tags: FALLBACK_TAGS,
  }
}

async function announcementsRequest<T>(
  path: string,
  { method = 'GET', body, role, designations }: RequestOptions,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': role,
      'X-User-Designations': designations.join(','),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`Announcements API ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchAnnouncementsWorkspace(
  campusId: string,
  role: Role,
  designations: Designation[],
  filters: AnnouncementFilters = {},
): Promise<AnnouncementsWorkspace> {
  const params = new URLSearchParams({ campus_id: campusId })
  if (filters.category) params.set('category', filters.category)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.courseId) params.set('course_id', filters.courseId)

  try {
    return await announcementsRequest<AnnouncementsWorkspace>(
      `/api/modules/announcements/workspace?${params.toString()}`,
      { role, designations },
    )
  } catch (error) {
    return fallbackAnnouncementsWorkspace(campusId, filters)
  }
}

export async function createAnnouncement(
  request: AnnouncementCreateRequest,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<AnnouncementRecord>> {
  try {
    return await announcementsRequest<ApiStatus<AnnouncementRecord>>('/api/modules/announcements', {
      method: 'POST',
      role,
      designations,
      body: request,
    })
  } catch (error) {
    const course = request.course_id
      ? fallbackCourses(request.campus_id).find((item) => item.course_id === request.course_id)
      : null
    return {
      status: 'preview',
      data: {
        id: `local-ann-${Date.now()}`,
        campus_id: request.campus_id,
        title: request.title,
        body: request.body,
        category: request.category,
        tag: request.tag,
        course_id: course?.course_id ?? request.course_id ?? null,
        course_code: course?.course_code ?? null,
        course_name: course?.course_name ?? null,
        created_by: request.created_by,
        created_by_name: request.created_by_name,
        audience: request.audience,
        priority: request.priority,
        created_at: new Date().toISOString(),
      },
    }
  }
}
