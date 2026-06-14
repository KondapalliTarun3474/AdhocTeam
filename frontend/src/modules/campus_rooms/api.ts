import { API_BASE } from '../../api/client'
import type { ApiStatus, Designation, Role } from '../../types/campus'
import { fallbackRoomsWorkspace } from './defaultRooms'
import type {
  CampusRoomsWorkspace,
  RoomBooking,
  RoomBookingRequest,
  RoomSetupConfig,
} from './types'

interface RoomsRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  body?: unknown
  role: Role
  designations: Designation[]
}

async function roomsRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    role,
    designations,
  }: RoomsRequestOptions,
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
    throw new Error(`Rooms API ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchRoomsWorkspace(
  campusId: string,
  role: Role,
  designations: Designation[],
): Promise<CampusRoomsWorkspace> {
  const params = new URLSearchParams({ campus_id: campusId })
  try {
    return await roomsRequest<CampusRoomsWorkspace>(
      `/api/modules/campus-rooms/workspace?${params.toString()}`,
      { role, designations },
    )
  } catch (error) {
    return fallbackRoomsWorkspace(campusId)
  }
}

export async function saveRoomConfig(
  config: RoomSetupConfig,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<RoomSetupConfig>> {
  try {
    return await roomsRequest<ApiStatus<RoomSetupConfig>>('/api/modules/campus-rooms/config', {
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

export async function createRoomBooking(
  booking: RoomBookingRequest,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<RoomBooking>> {
  try {
    return await roomsRequest<ApiStatus<RoomBooking>>('/api/modules/campus-rooms/bookings', {
      method: 'POST',
      role,
      designations,
      body: booking,
    })
  } catch (error) {
    return {
      status: 'preview',
      data: {
        ...booking,
        id: `local-${Date.now()}`,
        room_name: booking.room_id.toUpperCase(),
        status: booking.booking_type === 'block' ? 'blocked' : 'confirmed',
      },
    }
  }
}

export async function updateRoomBookingStatus(
  campusId: string,
  bookingId: string,
  status: string,
  notes: string,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<RoomBooking>> {
  const params = new URLSearchParams({ campus_id: campusId })
  try {
    return await roomsRequest<ApiStatus<RoomBooking>>(
      `/api/modules/campus-rooms/bookings/${bookingId}?${params.toString()}`,
      {
        method: 'PATCH',
        role,
        designations,
        body: { status, notes },
      },
    )
  } catch (error) {
    return { status: 'preview' }
  }
}
