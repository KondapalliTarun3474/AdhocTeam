import { API_BASE } from '../../api/client'
import type { ApiStatus, Designation, Role } from '../../types/campus'
import { buildSampleWeeklyMenu } from './defaultMenu'
import { DEFAULT_MEAL_TIMINGS } from './timings'
import type {
  MenuFeedbackRecord,
  MenuFeedbackRequest,
  MenuMealTiming,
  MenuRating,
  MenuSetupConfig,
  MenuWorkspace,
  SickMealRecord,
  SickMealRequest,
  WeeklyMenu,
} from './types'

interface MenuRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  body?: unknown
  role: Role
  designations: Designation[]
}

const fallbackConfig = (campusId: string): MenuSetupConfig => ({
  campus_id: campusId,
  module_key: 'menu',
  mode: 'default_app',
  source_url: 'https://foodcommittee.iiitb.ac.in',
  is_active: true,
})

interface BackendTiming {
  meal_type?: string
  mealType?: string
  label?: string
  start_label?: string
  startLabel?: string
  end_label?: string
  endLabel?: string
  start_minute?: number
  startMinute?: number
  end_minute?: number
  endMinute?: number
}

function normalizeTiming(value: BackendTiming): MenuMealTiming | null {
  const mealType = value.mealType ?? value.meal_type
  const startMinute = value.startMinute ?? value.start_minute
  const endMinute = value.endMinute ?? value.end_minute
  if (!mealType || startMinute === undefined || endMinute === undefined) {
    return null
  }

  return {
    mealType: mealType as MenuMealTiming['mealType'],
    label: value.label ?? mealType,
    startLabel: value.startLabel ?? value.start_label ?? '',
    endLabel: value.endLabel ?? value.end_label ?? '',
    startMinute,
    endMinute,
  }
}

function normalizeTimings(rawTimings: unknown): MenuMealTiming[] {
  if (!Array.isArray(rawTimings)) {
    return DEFAULT_MEAL_TIMINGS
  }
  const timings = rawTimings
    .map((timing) => normalizeTiming(timing as BackendTiming))
    .filter((timing): timing is MenuMealTiming => timing !== null)

  return timings.length > 0 ? timings : DEFAULT_MEAL_TIMINGS
}

function normalizeWorkspace(workspace: MenuWorkspace): MenuWorkspace {
  return {
    ...workspace,
    meal_timings: normalizeTimings(workspace.meal_timings),
  }
}

function timingToBackend(timing: MenuMealTiming) {
  return {
    meal_type: timing.mealType,
    label: timing.label,
    start_label: timing.startLabel,
    end_label: timing.endLabel,
    start_minute: timing.startMinute,
    end_minute: timing.endMinute,
  }
}

export const fallbackWorkspace = (campusId: string): MenuWorkspace => {
  const day = new Date().getDay()
  const isDue = day === 0 || day === 1 || day === 6

  return {
    config: fallbackConfig(campusId),
    weekly_menu: buildSampleWeeklyMenu(campusId),
    ratings: [],
    rating_summary: [],
    sick_meals: [],
    feedback: [],
    meal_timings: DEFAULT_MEAL_TIMINGS,
    reminder: {
      is_due: isDue,
      title: isDue ? 'Menu upload due' : 'This week is available',
      body: isDue
        ? "Food Committee students should publish this week's menu before Monday meals begin."
        : 'This week is available.',
    },
  }
}

async function menuRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    role,
    designations,
  }: MenuRequestOptions,
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
    throw new Error(`Menu API ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchMenuWorkspace(
  campusId: string,
  role: Role,
  designations: Designation[],
): Promise<MenuWorkspace> {
  const params = new URLSearchParams({ campus_id: campusId })
  try {
    const workspace = await menuRequest<MenuWorkspace>(`/api/modules/menu/workspace?${params.toString()}`, {
      role,
      designations,
    })
    return normalizeWorkspace(workspace)
  } catch (error) {
    return fallbackWorkspace(campusId)
  }
}

export async function saveMenuTimings(
  campusId: string,
  timings: MenuMealTiming[],
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<MenuMealTiming[]>> {
  try {
    const response = await menuRequest<ApiStatus<unknown>>('/api/modules/menu/timings', {
      method: 'PUT',
      role,
      designations,
      body: {
        campus_id: campusId,
        timings: timings.map(timingToBackend),
      },
    })
    return {
      status: response.status,
      data: response.data ? normalizeTimings(response.data) : timings,
      message: response.message,
    }
  } catch (error) {
    return { status: 'preview', data: timings }
  }
}

export async function saveMenuConfig(
  config: MenuSetupConfig,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<MenuSetupConfig>> {
  try {
    return await menuRequest<ApiStatus<MenuSetupConfig>>('/api/modules/menu/config', {
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

export async function saveWeeklyMenu(
  weeklyMenu: WeeklyMenu,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<WeeklyMenu>> {
  try {
    return await menuRequest<ApiStatus<WeeklyMenu>>('/api/modules/menu/week', {
      method: 'PUT',
      role,
      designations,
      body: weeklyMenu,
    })
  } catch (error) {
    return { status: 'preview', data: weeklyMenu }
  }
}

export async function importMenuExcel(
  file: File,
  campusId: string,
  weekStart: string,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<WeeklyMenu>> {
  const params = new URLSearchParams({ campus_id: campusId, week_start: weekStart })
  try {
    const response = await fetch(`${API_BASE}/api/modules/menu/import?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Filename': file.name,
        'X-User-Role': role,
        'X-User-Designations': designations.join(','),
      },
      body: await file.arrayBuffer(),
    })

    if (!response.ok) {
      throw new Error(`Menu import ${response.status}`)
    }

    return response.json() as Promise<ApiStatus<WeeklyMenu>>
  } catch (error) {
    return {
      status: 'preview',
      message: 'Menu import previewed locally. Backend import is offline.',
    }
  }
}

export async function submitMenuRating(
  rating: MenuRating,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<MenuRating>> {
  try {
    return await menuRequest<ApiStatus<MenuRating>>('/api/modules/menu/ratings', {
      method: 'POST',
      role,
      designations,
      body: rating,
    })
  } catch (error) {
    return { status: 'preview', data: rating }
  }
}

export async function submitSickMeal(
  request: SickMealRequest,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<SickMealRecord>> {
  try {
    return await menuRequest<ApiStatus<SickMealRecord>>('/api/modules/menu/sick-meals', {
      method: 'POST',
      role,
      designations,
      body: request,
    })
  } catch (error) {
    return { status: 'preview', data: { ...request, id: crypto.randomUUID(), status: 'requested', created_at: new Date().toISOString() } }
  }
}

export async function submitMenuFeedback(
  request: MenuFeedbackRequest,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<MenuFeedbackRecord>> {
  try {
    return await menuRequest<ApiStatus<MenuFeedbackRecord>>('/api/modules/menu/feedback', {
      method: 'POST',
      role,
      designations,
      body: request,
    })
  } catch (error) {
    return { status: 'preview', data: { ...request, id: crypto.randomUUID(), status: 'open', created_at: new Date().toISOString() } }
  }
}
