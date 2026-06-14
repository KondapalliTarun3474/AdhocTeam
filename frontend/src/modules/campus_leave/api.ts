import { API_BASE } from '../../api/client'
import type { ApiStatus, Designation, Role } from '../../types/campus'
import { fallbackLeaveWorkspace } from './defaultLeave'
import type {
  CampusLeaveWorkspace,
  LeaveApplicationRecord,
  LeaveApplicationRequest,
  LeaveSetupConfig,
  StudentRoomProfile,
} from './types'

interface LeaveRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  body?: unknown
  role: Role
  designations: Designation[]
}

async function leaveRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    role,
    designations,
  }: LeaveRequestOptions,
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

  if (!response.ok) {
    throw new Error(`Leave API ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchLeaveWorkspace(
  campusId: string,
  userId: string,
  role: Role,
  designations: Designation[],
): Promise<CampusLeaveWorkspace> {
  const params = new URLSearchParams({ campus_id: campusId, user_id: userId })
  try {
    return await leaveRequest<CampusLeaveWorkspace>(
      `/api/modules/campus-leave/workspace?${params.toString()}`,
      { role, designations },
    )
  } catch (error) {
    const fallback = fallbackLeaveWorkspace(campusId, userId)
    const canSeeAll = role === 'admin' || designations.includes('security') || designations.includes('warden')
    return canSeeAll
      ? fallback
      : { ...fallback, all_applications: [], student_directory: [] }
  }
}

export async function saveLeaveConfig(
  config: LeaveSetupConfig,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<LeaveSetupConfig>> {
  try {
    return await leaveRequest<ApiStatus<LeaveSetupConfig>>('/api/modules/campus-leave/config', {
      method: 'PUT',
      role,
      designations,
      body: {
        campus_id: config.campus_id,
        mode: config.mode,
        source_url: config.source_url,
        is_active: config.is_active,
      },
    })
  } catch (error) {
    return { status: 'preview', data: config }
  }
}

export async function createLeaveApplication(
  application: LeaveApplicationRequest,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<LeaveApplicationRecord>> {
  try {
    return await leaveRequest<ApiStatus<LeaveApplicationRecord>>('/api/modules/campus-leave/applications', {
      method: 'POST',
      role,
      designations,
      body: application,
    })
  } catch (error) {
    return {
      status: 'preview',
      data: {
        ...application,
        id: `local-${Date.now()}`,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
    }
  }
}

export async function updateLeaveApplicationStatus(
  campusId: string,
  applicationId: string,
  status: string,
  reviewedBy: string,
  securityNotes: string,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<LeaveApplicationRecord>> {
  const params = new URLSearchParams({ campus_id: campusId })
  try {
    return await leaveRequest<ApiStatus<LeaveApplicationRecord>>(
      `/api/modules/campus-leave/applications/${applicationId}?${params.toString()}`,
      {
        method: 'PATCH',
        role,
        designations,
        body: {
          status,
          reviewed_by: reviewedBy,
          security_notes: securityNotes,
        },
      },
    )
  } catch (error) {
    return { status: 'preview' }
  }
}

export async function updateCurfewCount(
  campusId: string,
  userId: string,
  count: number,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<StudentRoomProfile>> {
  const params = new URLSearchParams({ campus_id: campusId })
  try {
    return await leaveRequest<ApiStatus<StudentRoomProfile>>(
      `/api/modules/campus-leave/curfew?${params.toString()}`,
      {
        method: 'PATCH',
        role,
        designations,
        body: { user_id: userId, count },
      },
    )
  } catch (error) {
    return { status: 'preview' }
  }
}
