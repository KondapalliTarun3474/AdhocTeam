import { API_BASE, DEFAULT_CAMPUS_ID } from '../../api/client'
import type { ApiStatus, Designation, Role } from '../../types/campus'
import {
  DEFAULT_REGISTERED_COURSE_IDS,
  buildPersonalCalendar,
  fallbackCourses,
  fallbackSessions,
  findCourseConflicts,
} from '../academics/catalog'
import type { CourseConflict } from '../academics/types'
import type { ErpWorkspace } from './types'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  role: Role
  designations: Designation[]
}

export function fallbackErpWorkspace(campusId = DEFAULT_CAMPUS_ID, userId = 'demo-student'): ErpWorkspace {
  const courses = fallbackCourses(campusId)
  const registeredCourseIds = [...DEFAULT_REGISTERED_COURSE_IDS]
  return {
    campus_id: campusId,
    user_id: userId,
    courses,
    registered_course_ids: registeredCourseIds,
    registered_courses: courses.filter((course) => registeredCourseIds.includes(course.course_id)),
    registered_sessions: fallbackSessions(campusId, registeredCourseIds),
    personal_calendar: buildPersonalCalendar(registeredCourseIds, campusId),
  }
}

async function erpRequest<T>(
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
  if (!response.ok) throw new Error(`ERP API ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchErpWorkspace(
  campusId: string,
  userId: string,
  role: Role,
  designations: Designation[],
): Promise<ErpWorkspace> {
  const params = new URLSearchParams({ campus_id: campusId, user_id: userId })
  try {
    return await erpRequest<ErpWorkspace>(`/api/modules/erp/workspace?${params.toString()}`, {
      role,
      designations,
    })
  } catch (error) {
    return fallbackErpWorkspace(campusId, userId)
  }
}

function localWorkspaceWithCourses(
  workspace: ErpWorkspace,
  registeredCourseIds: string[],
): ErpWorkspace {
  return {
    ...workspace,
    registered_course_ids: registeredCourseIds,
    registered_courses: workspace.courses.filter((course) => registeredCourseIds.includes(course.course_id)),
    registered_sessions: fallbackSessions(workspace.campus_id, registeredCourseIds),
    personal_calendar: buildPersonalCalendar(registeredCourseIds, workspace.campus_id),
  }
}

export async function registerCourse(
  workspace: ErpWorkspace,
  courseId: string,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<ErpWorkspace> & { conflicts?: CourseConflict[] }> {
  try {
    return await erpRequest<ApiStatus<ErpWorkspace> & { conflicts?: CourseConflict[] }>('/api/modules/erp/registrations', {
      method: 'POST',
      role,
      designations,
      body: {
        campus_id: workspace.campus_id,
        user_id: workspace.user_id,
        course_id: courseId,
      },
    })
  } catch (error) {
    const conflicts = findCourseConflicts(workspace.registered_course_ids, courseId, workspace.campus_id)
    if (conflicts.length > 0) {
      return {
        status: 'error',
        message: 'Registration blocked because this course overlaps with your current timetable.',
        conflicts,
      }
    }
    return {
      status: 'preview',
      data: localWorkspaceWithCourses(workspace, [...workspace.registered_course_ids, courseId]),
    }
  }
}

export async function dropCourse(
  workspace: ErpWorkspace,
  courseId: string,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<ErpWorkspace>> {
  const params = new URLSearchParams({ campus_id: workspace.campus_id, user_id: workspace.user_id })
  try {
    return await erpRequest<ApiStatus<ErpWorkspace>>(
      `/api/modules/erp/registrations/${courseId}?${params.toString()}`,
      { method: 'DELETE', role, designations },
    )
  } catch (error) {
    return {
      status: 'preview',
      data: localWorkspaceWithCourses(
        workspace,
        workspace.registered_course_ids.filter((id) => id !== courseId),
      ),
    }
  }
}
