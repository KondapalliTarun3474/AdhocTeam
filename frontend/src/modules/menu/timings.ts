import type { MenuMealTiming } from './types'

export interface MealTimingState {
  canRate: boolean
  label: string
  status: 'upcoming' | 'open' | 'completed'
}

export const DEFAULT_MEAL_TIMINGS: MenuMealTiming[] = [
  {
    mealType: 'breakfast',
    label: 'Breakfast',
    startLabel: '7:30 AM',
    endLabel: '9:45 AM',
    startMinute: 7 * 60 + 30,
    endMinute: 9 * 60 + 45,
  },
  {
    mealType: 'lunch',
    label: 'Lunch',
    startLabel: '12:30 PM',
    endLabel: '2:00 PM',
    startMinute: 12 * 60 + 30,
    endMinute: 14 * 60,
  },
  {
    mealType: 'snacks',
    label: 'Snacks',
    startLabel: '4:30 PM',
    endLabel: '5:45 PM',
    startMinute: 16 * 60 + 30,
    endMinute: 17 * 60 + 45,
  },
  {
    mealType: 'dinner',
    label: 'Dinner',
    startLabel: '7:30 PM',
    endLabel: '9:30 PM',
    startMinute: 19 * 60 + 30,
    endMinute: 21 * 60 + 30,
  },
]

export function getMealTiming(
  mealType: string,
  timings: MenuMealTiming[] = DEFAULT_MEAL_TIMINGS,
) {
  return timings.find((meal) => meal.mealType === mealType)
}

export function localIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function minutesNow(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes()
}

export function getMealTimingState(
  date: string,
  mealType: string,
  timings: MenuMealTiming[] = DEFAULT_MEAL_TIMINGS,
  now = new Date(),
): MealTimingState {
  const timing = getMealTiming(mealType, timings)
  if (!timing) {
    return { canRate: true, label: 'Available', status: 'open' }
  }

  const today = localIsoDate(now)
  if (date < today) {
    return { canRate: true, label: 'Completed', status: 'completed' }
  }

  if (date > today) {
    return { canRate: false, label: `Opens ${timing.startLabel}`, status: 'upcoming' }
  }

  const currentMinute = minutesNow(now)
  if (currentMinute < timing.startMinute) {
    return { canRate: false, label: `Opens ${timing.startLabel}`, status: 'upcoming' }
  }

  if (currentMinute <= timing.endMinute) {
    return { canRate: true, label: 'Open now', status: 'open' }
  }

  return { canRate: true, label: 'Completed', status: 'completed' }
}

export function defaultWeekdayIndex(date = new Date()) {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}
