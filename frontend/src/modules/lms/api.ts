import { API_BASE, DEFAULT_CAMPUS_ID } from '../../api/client'
import type { ApiStatus, Designation, Role } from '../../types/campus'
import { DEFAULT_REGISTERED_COURSE_IDS, fallbackCourses } from '../academics/catalog'
import type { AssignmentRecord, AssignmentSubmissionRecord, LmsWorkspace } from './types'

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: BodyInit
  headers?: Record<string, string>
  role: Role
  designations: Designation[]
}

function fallbackAssignments(campusId = DEFAULT_CAMPUS_ID): AssignmentRecord[] {
  const today = new Date()
  return fallbackCourses(campusId)
    .filter((course) => DEFAULT_REGISTERED_COURSE_IDS.includes(course.course_id))
    .map((course, index) => {
      const due = new Date(today)
      due.setDate(today.getDate() + 3 + index)
      due.setHours(23, 59, 0, 0)
      return {
        id: `asg-${course.course_id}`,
        campus_id: campusId,
        course_id: course.course_id,
        course_code: course.course_code,
        course_name: course.course_name,
        title: 'Assignment 1',
        description: `Submit a PDF response for ${course.course_code}.`,
        deadline_at: due.toISOString().slice(0, 16),
        created_by: course.professor_id,
      }
    })
}

export function fallbackLmsWorkspace(campusId = DEFAULT_CAMPUS_ID, userId = 'demo-student'): LmsWorkspace {
  return {
    campus_id: campusId,
    user_id: userId,
    courses: fallbackCourses(campusId).filter((course) => DEFAULT_REGISTERED_COURSE_IDS.includes(course.course_id)),
    assignments: fallbackAssignments(campusId),
    submissions: [],
  }
}

async function lmsRequest<T>(
  path: string,
  { method = 'GET', body, headers = {}, role, designations }: RequestOptions,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...headers,
      'X-User-Role': role,
      'X-User-Designations': designations.join(','),
    },
    body,
  })
  if (!response.ok) throw new Error(`LMS API ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchLmsWorkspace(
  campusId: string,
  userId: string,
  role: Role,
  designations: Designation[],
): Promise<LmsWorkspace> {
  const params = new URLSearchParams({ campus_id: campusId, user_id: userId })
  try {
    return await lmsRequest<LmsWorkspace>(`/api/modules/lms/workspace?${params.toString()}`, {
      role,
      designations,
    })
  } catch (error) {
    return fallbackLmsWorkspace(campusId, userId)
  }
}

export async function submitAssignmentPdf(
  file: File,
  assignment: AssignmentRecord,
  userId: string,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<AssignmentSubmissionRecord>> {
  const params = new URLSearchParams({ campus_id: assignment.campus_id, user_id: userId })
  try {
    return await lmsRequest<ApiStatus<AssignmentSubmissionRecord>>(
      `/api/modules/lms/submissions?${params.toString()}`,
      {
        method: 'POST',
        role,
        designations,
        headers: {
          'Content-Type': file.type || 'application/pdf',
          'X-Assignment-Id': assignment.id,
          'X-Course-Id': assignment.course_id,
          'X-Filename': file.name,
        },
        body: await file.arrayBuffer(),
      },
    )
  } catch (error) {
    return {
      status: 'preview',
      data: {
        id: `local-${Date.now()}`,
        campus_id: assignment.campus_id,
        assignment_id: assignment.id,
        course_id: assignment.course_id,
        user_id: userId,
        filename: file.name,
        content_type: file.type || 'application/pdf',
        size_bytes: file.size,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      },
    }
  }
}
