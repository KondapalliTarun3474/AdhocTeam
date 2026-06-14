import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackWorkspace, fetchMenuWorkspace } from './api'
import { DEFAULT_MEAL_TIMINGS, defaultWeekdayIndex, localIsoDate, minutesNow } from './timings'
import type { MenuMeal, MenuWorkspace } from './types'
import './MenuGlance.css'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`))
}

function findMeal(dayMeals: MenuMeal[], mealType: string) {
  return dayMeals.find((meal) => meal.meal_type === mealType)
}

function nextMeal(workspace: MenuWorkspace) {
  const now = new Date()
  const currentMinutes = minutesNow(now)
  const days = workspace.weekly_menu.days
  const timings = workspace.meal_timings.length > 0
    ? workspace.meal_timings
    : DEFAULT_MEAL_TIMINGS
  const today = localIsoDate(now)
  const todayIndex = days.findIndex((day) => day.date === today)
  const fallbackIndex = todayIndex >= 0 ? todayIndex : defaultWeekdayIndex(now)
  const startIndex = days[fallbackIndex] ? fallbackIndex : 0

  for (let dayOffset = 0; dayOffset < days.length; dayOffset += 1) {
    const dayIndex = (startIndex + dayOffset) % days.length
    const day = days[dayIndex]
    const mealCandidates = dayOffset === 0
      ? timings.filter((meal) => meal.startMinute >= currentMinutes)
      : timings

    for (const mealWindow of mealCandidates) {
      const meal = findMeal(day.meals, mealWindow.mealType)
      if (meal && meal.items.length > 0) {
        return { day, meal, mealWindow }
      }
    }
  }

  const firstDay = days[0]
  const firstMeal = firstDay?.meals[0]
  const fallbackWindow = timings.find((meal) => meal.mealType === firstMeal?.meal_type) ?? timings[0]
  return firstDay && firstMeal
    ? { day: firstDay, meal: firstMeal, mealWindow: fallbackWindow }
    : null
}

function MenuGlance({
  campusId,
  designations,
  isLoading,
  openModule,
  role,
}: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<MenuWorkspace>(() => fallbackWorkspace(campusId))

  useEffect(() => {
    let ignore = false
    fetchMenuWorkspace(campusId, role, designations).then((data) => {
      if (!ignore) {
        setWorkspace(data)
      }
    })

    return () => {
      ignore = true
    }
  }, [campusId, role, designations])

  const upcoming = useMemo(() => nextMeal(workspace), [workspace])
  const items = upcoming?.meal.items ?? []
  const canManage = role === 'admin' || designations.includes('food_committee')

  return (
    <section className="menu-glance" aria-label="Foode next meal">
      <div className="menu-glance-header">
        <div>
          <span>Foode</span>
          <h2>Next Meal</h2>
        </div>
        <strong>{isLoading ? 'Loading' : upcoming?.mealWindow.startLabel ?? '--:--'}</strong>
      </div>

      {upcoming ? (
        <div className="menu-glance-body">
          <div className="menu-glance-meal">
            <span>{formatDate(upcoming.day.date)}</span>
            <h3>{upcoming.mealWindow.label}</h3>
          </div>
          <ul>
            {items.slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {items.length > 5 && <p>+{items.length - 5} more items</p>}
        </div>
      ) : (
        <p className="menu-glance-empty">No menu published yet.</p>
      )}

      {canManage && workspace.reminder?.is_due && (
        <div className="menu-glance-reminder">
          <strong>{workspace.reminder.title}</strong>
          <span>{workspace.reminder.body}</span>
        </div>
      )}

      <button onClick={() => openModule?.('menu')} type="button">
        Open Foode
      </button>
    </section>
  )
}

export default MenuGlance
