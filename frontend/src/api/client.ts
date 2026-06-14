import type {
  ApiStatus,
  AssistantResponse,
  HubOverview,
  MenuDay,
  MenuReview,
  Role,
} from '../types/campus'

export const DEFAULT_CAMPUS_ID = '00000000-0000-0000-0000-000000000000'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const todayIso = () => new Date().toISOString().slice(0, 10)

export function fallbackOverview(role: Role = 'student'): HubOverview {
  const today = todayIso()

  return {
    campus_id: DEFAULT_CAMPUS_ID,
    user_id: 'demo-student',
    role,
    date: today,
    notifications: [
      {
        id: 'local-menu',
        module_key: 'menu',
        title: 'Lunch menu is available',
        body: "The Menu module is connected to the hub. Backend data will replace this local fallback when the API is running.",
        priority: 'high',
      },
      {
        id: 'local-rbac',
        module_key: 'rbac',
        title: 'Role controls are active',
        body: 'Switch roles to see student, food committee, and admin access states.',
        priority: 'normal',
      },
    ],
    updates: [
      {
        module_key: 'menu',
        title: 'Menu module scaffolded',
        body: 'Students can review dishes. Food committee and admins can manage menu entries.',
      },
      {
        module_key: 'hub',
        title: 'Hub feed ready',
        body: 'LMS, ERP, Exam LMS, and Leave modules can publish updates into this area later.',
      },
    ],
    calendar: [
      { time: '09:00', title: 'Daily campus briefing', module_key: 'hub' },
      { time: '12:30', title: 'Lunch window', module_key: 'menu' },
      { time: '17:00', title: 'Module update checkpoint', module_key: 'hub' },
    ],
    modules: [
      {
        key: 'menu',
        name: 'Menu',
        status: 'connected',
        available: true,
        summary: 'Today meals, food committee updates, and student reviews.',
      },
      {
        key: 'lms',
        name: 'LMS',
        status: 'planned',
        available: ['student', 'professor', 'teaching_assistant', 'admin'].includes(role),
        summary: 'Courses, assignments, materials, and TA workflows.',
      },
      {
        key: 'erp',
        name: 'ERP',
        status: 'planned',
        available: ['student', 'admin'].includes(role),
        summary: 'Fee receipts, profile records, transport, and services.',
      },
      {
        key: 'exam_lms',
        name: 'Exam LMS',
        status: 'planned',
        available: ['student', 'professor', 'admin'].includes(role),
        summary: 'Exam schedules, hall tickets, marks, and revaluation updates.',
      },
      {
        key: 'campus_leave',
        name: 'Campus Leave',
        status: 'planned',
        available: ['student', 'admin'].includes(role),
        summary: 'Leave requests, approvals, gate passes, and guardian alerts.',
      },
    ],
    menu: {
      campus_id: DEFAULT_CAMPUS_ID,
      date: today,
      meals: [
        { meal_type: 'breakfast', items: ['Idli', 'Vada', 'Filter Coffee'] },
        { meal_type: 'lunch', items: ['Paneer Butter Masala', 'Jeera Rice', 'Dal Tadka', 'Roti'] },
        { meal_type: 'dinner', items: ['Aloo Gobi', 'Dal Makhani', 'Naan', 'Gulab Jamun'] },
      ],
    },
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  role?: Role
}

interface HubOverviewParams {
  campusId?: string
  userId?: string
  role?: Role
}

interface AssistantMessageParams extends HubOverviewParams {
  message: string
}

async function requestJson<T>(
  path: string,
  { method = 'GET', body, role = 'student' }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': role,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`API ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchHubOverview({
  campusId = DEFAULT_CAMPUS_ID,
  userId = 'demo-student',
  role = 'student',
}: HubOverviewParams): Promise<HubOverview> {
  const params = new URLSearchParams({ campus_id: campusId, user_id: userId })

  try {
    return await requestJson<HubOverview>(`/api/hub/overview?${params.toString()}`, { role })
  } catch (error) {
    return fallbackOverview(role)
  }
}

export async function sendAssistantMessage({
  message,
  campusId = DEFAULT_CAMPUS_ID,
  userId = 'demo-student',
  role = 'student',
}: AssistantMessageParams): Promise<AssistantResponse> {
  try {
    return await requestJson<AssistantResponse>('/api/chat', {
      method: 'POST',
      role,
      body: {
        message,
        campus_id: campusId,
        user_id: userId,
        role,
      },
    })
  } catch (error) {
    const fallback = fallbackOverview(role)
    const menuText = (fallback.menu?.meals ?? [])
      .map((meal) => `${meal.meal_type}: ${meal.items.join(', ')}`)
      .join('\n')

    return {
      reply: message.toLowerCase().includes('menu') || message.toLowerCase().includes('lunch')
        ? `Local Menu fallback:\n${menuText}`
        : 'Assistant API is offline. The hub and module fallback data are still available.',
    }
  }
}

export async function submitMenuReview(
  review: MenuReview,
  role: Role = 'student',
): Promise<ApiStatus<MenuReview>> {
  try {
    return await requestJson<ApiStatus<MenuReview>>('/api/modules/menu/reviews', {
      method: 'POST',
      role,
      body: review,
    })
  } catch (error) {
    return { status: 'preview', data: review }
  }
}

export async function updateMenu(
  menu: MenuDay,
  role: Role = 'food_committee',
): Promise<ApiStatus<MenuDay>> {
  try {
    return await requestJson<ApiStatus<MenuDay>>('/api/modules/menu', {
      method: 'PUT',
      role,
      body: menu,
    })
  } catch (error) {
    return { status: 'preview', data: menu }
  }
}
