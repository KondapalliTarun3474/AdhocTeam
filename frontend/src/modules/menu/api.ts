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

function firstPayload<T>(data: unknown): T | undefined {
  if (Array.isArray(data)) {
    return data[0] as T | undefined
  }
  if (data && typeof data === 'object') {
    return data as T
  }
  return undefined
}

function normalizeStatus<T>(response: ApiStatus<unknown>, fallback: T): ApiStatus<T> {
  return {
    status: response.status,
    data: firstPayload<T>(response.data) ?? fallback,
    message: response.message,
  }
}

function normalizeWeeklyMenu(rawMenu: unknown, campusId: string): WeeklyMenu {
  const fallback = buildSampleWeeklyMenu(campusId)
  if (!rawMenu || typeof rawMenu !== 'object') return fallback

  const menu = rawMenu as Partial<WeeklyMenu>
  const days = Array.isArray(menu.days)
    ? menu.days.map((day, index) => ({
      date: typeof day?.date === 'string' ? day.date : fallback.days[index]?.date ?? fallback.week_start,
      day_name: typeof day?.day_name === 'string' ? day.day_name : fallback.days[index]?.day_name ?? 'Day',
      meals: Array.isArray(day?.meals)
        ? day.meals.map((meal) => ({
          meal_type: meal?.meal_type ?? 'lunch',
          items: Array.isArray(meal?.items) ? meal.items.filter((item): item is string => typeof item === 'string') : [],
        }))
        : [],
    }))
    : fallback.days

  return {
    campus_id: typeof menu.campus_id === 'string' ? menu.campus_id : campusId,
    week_start: typeof menu.week_start === 'string' ? menu.week_start : fallback.week_start,
    days,
    imported_from: menu.imported_from,
    last_updated_at: menu.last_updated_at,
  }
}

function normalizeConfig(rawConfig: unknown, campusId: string): MenuSetupConfig {
  const fallback = fallbackConfig(campusId)
  if (!rawConfig || typeof rawConfig !== 'object') return fallback
  const config = rawConfig as Partial<MenuSetupConfig>
  return {
    ...fallback,
    ...config,
    campus_id: typeof config.campus_id === 'string' ? config.campus_id : campusId,
    module_key: 'menu',
    mode: config.mode === 'external_website' ? 'external_website' : 'default_app',
    is_active: typeof config.is_active === 'boolean' ? config.is_active : fallback.is_active,
  }
}

function normalizeWorkspace(workspace: Partial<MenuWorkspace>, campusId: string): MenuWorkspace {
  return {
    config: normalizeConfig(workspace.config, campusId),
    weekly_menu: normalizeWeeklyMenu(workspace.weekly_menu, campusId),
    ratings: Array.isArray(workspace.ratings) ? workspace.ratings.filter((item): item is MenuRating => Boolean(item && typeof item === 'object' && 'item_name' in item)) : [],
    rating_summary: Array.isArray(workspace.rating_summary) ? workspace.rating_summary : [],
    sick_meals: Array.isArray(workspace.sick_meals) ? workspace.sick_meals.filter((item): item is SickMealRecord => Boolean(item && typeof item === 'object' && 'id' in item)) : [],
    feedback: Array.isArray(workspace.feedback) ? workspace.feedback.filter((item): item is MenuFeedbackRecord => Boolean(item && typeof item === 'object' && 'id' in item)) : [],
    meal_timings: normalizeTimings(workspace.meal_timings),
    reminder: workspace.reminder ?? null,
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
    return normalizeWorkspace(workspace, campusId)
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
    const response = await menuRequest<ApiStatus<unknown>>('/api/modules/menu/config', {
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
    return normalizeStatus(response, config)
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
    const response = await menuRequest<ApiStatus<unknown>>('/api/modules/menu/week', {
      method: 'PUT',
      role,
      designations,
      body: weeklyMenu,
    })
    return normalizeStatus(response, weeklyMenu)
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
    const response = await menuRequest<ApiStatus<unknown>>('/api/modules/menu/ratings', {
      method: 'POST',
      role,
      designations,
      body: rating,
    })
    return normalizeStatus(response, rating)
  } catch (error) {
    return { status: 'preview', data: rating }
  }
}

export async function submitSickMeal(
  request: SickMealRequest,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<SickMealRecord>> {
  const fallback = { ...request, id: crypto.randomUUID(), status: 'requested', created_at: new Date().toISOString() }
  try {
    const response = await menuRequest<ApiStatus<unknown>>('/api/modules/menu/sick-meals', {
      method: 'POST',
      role,
      designations,
      body: request,
    })
    return normalizeStatus(response, fallback)
  } catch (error) {
    return { status: 'preview', data: fallback }
  }
}

export async function submitMenuFeedback(
  request: MenuFeedbackRequest,
  role: Role,
  designations: Designation[],
): Promise<ApiStatus<MenuFeedbackRecord>> {
  const fallback = { ...request, id: crypto.randomUUID(), status: 'open', created_at: new Date().toISOString() }
  try {
    const response = await menuRequest<ApiStatus<unknown>>('/api/modules/menu/feedback', {
      method: 'POST',
      role,
      designations,
      body: request,
    })
    return normalizeStatus(response, fallback)
  } catch (error) {
    return { status: 'preview', data: fallback }
  }
}
