import type {
  ApiStatus,
  AssistantResponse,
  Designation,
  HubOverview,
  MenuDay,
  MenuReview,
  Role,
} from '../types/campus'

export const DEFAULT_CAMPUS_ID = '00000000-0000-0000-0000-000000000000'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const todayIso = () => new Date().toISOString().slice(0, 10)

export function fallbackOverview(
  role: Role = 'student',
  designations: Designation[] = [],
): HubOverview {
  const today = todayIso()
  const hasDesignation = (designation: Designation) => designations.includes(designation)

  return {
    campus_id: DEFAULT_CAMPUS_ID,
    user_id: 'demo-student',
    role,
    designations,
    date: today,
    notifications: [
      {
        id: 'local-menu',
        module_key: 'menu',
        title: hasDesignation('food_committee') ? 'Menu upload reminder' : 'Weekly menu is available',
        body: hasDesignation('food_committee')
          ? 'Food Committee students should publish the weekly menu before Monday meals begin.'
          : 'The Menu module is connected to the hub. Backend data will replace this local fallback when the API is running.',
        priority: 'high',
      },
      {
        id: 'local-rbac',
        module_key: 'rbac',
        title: 'Access controls are active',
        body: 'Roles are global; Food Committee, TA, Warden, Security, and Classroom Support are designations.',
        priority: 'normal',
      },
    ],
    updates: [
      {
        module_key: 'menu',
        title: 'Menu module scaffolded',
        body: 'Students can rate items, request sick meals, and send feedback. Food Committee designees can manage menus.',
      },
      {
        module_key: 'hub',
        title: 'Hub feed ready',
        body: 'Rooms, Leave, LMS, ERP, and Exam LMS modules can publish updates into this area.',
      },
      {
        module_key: 'campus_rooms',
        title: 'Room tracker connected',
        body: 'The hub can show upcoming room bookings from the Campus Room Tracker.',
      },
      {
        module_key: 'campus_leave',
        title: 'Leave module connected',
        body: 'Students can request leave while Security and Wardens get dedicated views.',
      },
    ],
    calendar: [
      { time: '09:00', title: 'Daily campus briefing', module_key: 'hub' },
      { time: '10:00', title: 'R109: Imaginate Bootcamp', module_key: 'campus_rooms' },
      { time: '12:30', title: 'Lunch window', module_key: 'menu' },
      { time: '17:00', title: 'Module update checkpoint', module_key: 'hub' },
    ],
    modules: [
      {
        key: 'menu',
        name: 'Menu',
        status: 'connected',
        available: true,
        summary: 'Weekly meals, item ratings, sick meals, and feedback.',
        roles: ['student', 'admin'],
        designations: ['food_committee'],
      },
      {
        key: 'campus_rooms',
        name: 'Campus Room Tracker',
        status: 'connected',
        available: true,
        summary: 'Room bookings, course-linked classes, and classroom support blocks.',
        roles: ['student', 'professor', 'staff', 'admin'],
        designations: ['classroom_support', 'warden', 'security'],
      },
      {
        key: 'campus_leave',
        name: 'Leave Application',
        status: 'connected',
        available: ['student', 'staff', 'admin'].includes(role) || hasDesignation('warden'),
        summary: 'Leave requests, guardian contacts, curfew records, security, and warden views.',
        roles: ['student', 'staff', 'admin'],
        designations: ['security', 'warden'],
      },
      {
        key: 'lms',
        name: 'LMS',
        status: 'planned',
        available: ['student', 'professor', 'admin'].includes(role) || hasDesignation('teaching_assistant'),
        summary: 'Courses, assignments, materials, and TA workflows.',
        roles: ['student', 'professor', 'admin'],
        designations: ['teaching_assistant'],
      },
      {
        key: 'erp',
        name: 'ERP',
        status: 'planned',
        available: ['student', 'admin'].includes(role),
        summary: 'Fee receipts, profile records, transport, and services.',
        roles: ['student', 'admin'],
      },
      {
        key: 'exam_lms',
        name: 'Exam LMS',
        status: 'planned',
        available: ['student', 'professor', 'admin'].includes(role),
        summary: 'Exam schedules, hall tickets, marks, and revaluation updates.',
        roles: ['student', 'professor', 'admin'],
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
  designations?: Designation[]
}

interface HubOverviewParams {
  campusId?: string
  userId?: string
  role?: Role
  designations?: Designation[]
}

interface AssistantMessageParams extends HubOverviewParams {
  message: string
}

async function requestJson<T>(
  path: string,
  {
    method = 'GET',
    body,
    role = 'student',
    designations = [],
  }: RequestOptions = {},
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
    throw new Error(`API ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function fetchHubOverview({
  campusId = DEFAULT_CAMPUS_ID,
  userId = 'demo-student',
  role = 'student',
  designations = [],
}: HubOverviewParams): Promise<HubOverview> {
  const params = new URLSearchParams({ campus_id: campusId, user_id: userId })

  try {
    return await requestJson<HubOverview>(
      `/api/hub/overview?${params.toString()}`,
      { role, designations },
    )
  } catch (error) {
    return fallbackOverview(role, designations)
  }
}

export async function sendAssistantMessage({
  message,
  campusId = DEFAULT_CAMPUS_ID,
  userId = 'demo-student',
  role = 'student',
  designations = [],
}: AssistantMessageParams): Promise<AssistantResponse> {
  try {
    return await requestJson<AssistantResponse>('/api/chat', {
      method: 'POST',
      role,
      designations,
      body: {
        message,
        campus_id: campusId,
        user_id: userId,
        role,
        designations,
      },
    })
  } catch (error) {
    const fallback = fallbackOverview(role, designations)
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
  designations: Designation[] = [],
): Promise<ApiStatus<MenuReview>> {
  try {
    return await requestJson<ApiStatus<MenuReview>>('/api/modules/menu/reviews', {
      method: 'POST',
      role,
      designations,
      body: review,
    })
  } catch (error) {
    return { status: 'preview', data: review }
  }
}

export async function updateMenu(
  menu: MenuDay,
  role: Role = 'student',
  designations: Designation[] = ['food_committee'],
): Promise<ApiStatus<MenuDay>> {
  try {
    return await requestJson<ApiStatus<MenuDay>>('/api/modules/menu', {
      method: 'PUT',
      role,
      designations,
      body: menu,
    })
  } catch (error) {
    return { status: 'preview', data: menu }
  }
}
