import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import {
  fallbackWorkspace,
  fetchMenuWorkspace,
  importMenuExcel,
  saveMenuConfig,
  saveMenuTimings,
  saveWeeklyMenu,
  submitMenuFeedback,
  submitMenuRating,
  submitSickMeal,
} from './api'
import {
  DEFAULT_MEAL_TIMINGS,
  defaultWeekdayIndex,
  getMealTiming,
  getMealTimingState,
} from './timings'
import type {
  MenuFeedbackRequest,
  MenuMealTiming,
  MenuMeal,
  MenuMealType,
  MenuRating,
  MenuSetupConfig,
  MenuTab,
  MenuWeekDay,
  MenuWorkspace,
  SickMealRequest,
  WeeklyMenu,
} from './types'
import './MenuWidget.css'

const MEAL_TYPES: MenuMealType[] = ['breakfast', 'lunch', 'snacks', 'dinner']

interface RatingFormState {
  dayIndex: number
  mealType: string
  itemName: string
  rating: string
  comment: string
}

interface SickMealFormState {
  dayIndex: number
  mealType: string
  reason: string
  deliveryLocation: string
  contactNumber: string
  notes: string
}

interface FeedbackFormState {
  category: string
  dayIndex: number
  mealType: string
  itemName: string
  message: string
}

interface TimingDraft {
  mealType: MenuMealType
  label: string
  startTime: string
  endTime: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`))
}

function titleCase(value?: string | null) {
  return String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
}

function minutesToInputValue(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function inputValueToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours * 60) + minutes
}

function timeInputToLabel(value: string) {
  const [rawHours, rawMinutes] = value.split(':').map(Number)
  const period = rawHours >= 12 ? 'PM' : 'AM'
  const displayHours = rawHours % 12 || 12
  return `${displayHours}:${String(rawMinutes).padStart(2, '0')} ${period}`
}

function timingsToDrafts(timings: MenuMealTiming[]): TimingDraft[] {
  return timings.map((timing) => ({
    mealType: timing.mealType,
    label: timing.label,
    startTime: minutesToInputValue(timing.startMinute),
    endTime: minutesToInputValue(timing.endMinute),
  }))
}

function draftsToTimings(drafts: TimingDraft[]): MenuMealTiming[] {
  return drafts.map((draft) => ({
    mealType: draft.mealType,
    label: draft.label,
    startLabel: timeInputToLabel(draft.startTime),
    endLabel: timeInputToLabel(draft.endTime),
    startMinute: inputValueToMinutes(draft.startTime),
    endMinute: inputValueToMinutes(draft.endTime),
  }))
}

function normalizeExternalUrl(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function cloneWeeklyMenu(menu: WeeklyMenu): WeeklyMenu {
  return {
    ...menu,
    days: menu.days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({
        meal_type: meal.meal_type,
        items: [...meal.items],
      })),
    })),
  }
}

function mealForDay(day: MenuWeekDay | undefined, mealType: string): MenuMeal | undefined {
  return day?.meals.find((meal) => meal.meal_type === mealType)
}

function firstMeal(day: MenuWeekDay | undefined) {
  return day?.meals[0]
}

function firstItem(day: MenuWeekDay | undefined, mealType: string) {
  return mealForDay(day, mealType)?.items[0] ?? firstMeal(day)?.items[0] ?? ''
}

function ratingSummary(ratings: MenuRating[]) {
  const grouped = new Map<string, {
    date: string
    day_name: string
    meal_type: string
    item_name: string
    total: number
    count: number
  }>()

  ratings.forEach((rating) => {
    const key = `${rating.date}|${rating.meal_type}|${rating.item_name}`
    const current = grouped.get(key) ?? {
      date: rating.date,
      day_name: rating.day_name,
      meal_type: rating.meal_type,
      item_name: rating.item_name,
      total: 0,
      count: 0,
    }
    current.total += rating.rating
    current.count += 1
    grouped.set(key, current)
  })

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      average: item.total / item.count,
    }))
    .sort((a, b) => b.average - a.average)
}

function MenuWidget({
  campusId,
  designations,
  isLoading,
  role,
  userId,
}: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<MenuWorkspace>(() => fallbackWorkspace(campusId))
  const [configDraft, setConfigDraft] = useState<MenuSetupConfig>(() => fallbackWorkspace(campusId).config)
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyMenu>(() => fallbackWorkspace(campusId).weekly_menu)
  const [mealTimings, setMealTimings] = useState<MenuMealTiming[]>(DEFAULT_MEAL_TIMINGS)
  const [timingDrafts, setTimingDrafts] = useState<TimingDraft[]>(() => timingsToDrafts(DEFAULT_MEAL_TIMINGS))
  const [activeTab, setActiveTab] = useState<MenuTab>('daily')
  const [status, setStatus] = useState('')
  const [dailyDayIndex, setDailyDayIndex] = useState(defaultWeekdayIndex())
  const [ratingForm, setRatingForm] = useState<RatingFormState>({
    dayIndex: defaultWeekdayIndex(),
    mealType: 'lunch',
    itemName: '',
    rating: '5',
    comment: '',
  })
  const [sickMealForm, setSickMealForm] = useState<SickMealFormState>({
    dayIndex: 0,
    mealType: 'lunch',
    reason: '',
    deliveryLocation: '',
    contactNumber: '',
    notes: '',
  })
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormState>({
    category: 'quality',
    dayIndex: 0,
    mealType: 'lunch',
    itemName: '',
    message: '',
  })
  const [committeeDayIndex, setCommitteeDayIndex] = useState(0)
  const [committeeMealType, setCommitteeMealType] = useState<string>('lunch')
  const [committeeItems, setCommitteeItems] = useState('')

  const canManage = role === 'admin' || designations.includes('food_committee')
  const canConfigure = role === 'admin'
  const externalUrl = normalizeExternalUrl(configDraft.source_url)
  const selectedCommitteeDay = weeklyDraft.days[committeeDayIndex]
  const selectedCommitteeMeal = mealForDay(selectedCommitteeDay, committeeMealType)

  useEffect(() => {
    let ignore = false
    fetchMenuWorkspace(campusId, role, designations).then((data) => {
      if (ignore) return
      setWorkspace(data)
      setConfigDraft(data.config)
      setWeeklyDraft(cloneWeeklyMenu(data.weekly_menu))
      setMealTimings(data.meal_timings)
      setTimingDrafts(timingsToDrafts(data.meal_timings))
    })

    return () => {
      ignore = true
    }
  }, [campusId, role, designations])

  useEffect(() => {
    const day = weeklyDraft.days[ratingForm.dayIndex] ?? weeklyDraft.days[0]
    const meal = mealForDay(day, ratingForm.mealType) ?? firstMeal(day)
    const item = meal?.items.includes(ratingForm.itemName)
      ? ratingForm.itemName
      : meal?.items[0] ?? ''

    setRatingForm((current) => ({
      ...current,
      mealType: meal?.meal_type ?? current.mealType,
      itemName: item,
    }))
  }, [weeklyDraft, ratingForm.dayIndex, ratingForm.mealType, ratingForm.itemName])

  useEffect(() => {
    const day = weeklyDraft.days[feedbackForm.dayIndex] ?? weeklyDraft.days[0]
    const meal = mealForDay(day, feedbackForm.mealType) ?? firstMeal(day)
    const item = meal?.items.includes(feedbackForm.itemName)
      ? feedbackForm.itemName
      : meal?.items[0] ?? ''

    setFeedbackForm((current) => ({
      ...current,
      mealType: meal?.meal_type ?? current.mealType,
      itemName: item,
    }))
  }, [weeklyDraft, feedbackForm.dayIndex, feedbackForm.mealType, feedbackForm.itemName])

  useEffect(() => {
    const items = selectedCommitteeMeal?.items.join('\n') ?? ''
    setCommitteeItems(items)
  }, [selectedCommitteeMeal])

  const tabs = useMemo(() => ([
    { id: 'daily' as const, label: 'Daily Menu' },
    { id: 'weekly' as const, label: 'Weekly Menu' },
    { id: 'ratings' as const, label: 'Ratings' },
    { id: 'sickMeals' as const, label: 'Sick Meals' },
    { id: 'feedback' as const, label: 'Feedback' },
    { id: 'timings' as const, label: 'Timings' },
    ...(canManage ? [{ id: 'committee' as const, label: 'Food Committee' }] : []),
  ]), [canManage])

  const summary = useMemo(() => ratingSummary(workspace.ratings), [workspace.ratings])

  const chooseItemForRating = (dayIndex: number, mealType: string, itemName: string) => {
    const day = weeklyDraft.days[dayIndex]
    if (!day) return

    const timingState = getMealTimingState(day.date, mealType, mealTimings)
    if (!timingState.canRate) {
      const timing = getMealTiming(mealType, mealTimings)
      setStatus(`${titleCase(itemName)} can be rated after ${timing?.startLabel ?? 'the meal starts'}.`)
      return
    }

    setRatingForm((current) => ({
      ...current,
      dayIndex,
      mealType,
      itemName,
      comment: '',
    }))
    setActiveTab('ratings')
    setStatus(`Ready to rate ${itemName}.`)
  }

  const handleConfigSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canConfigure) return

    setStatus('Saving module setup...')
    const response = await saveMenuConfig(configDraft, role, designations)
    setWorkspace((current) => ({
      ...current,
      config: response.data ?? configDraft,
    }))
    setStatus(response.status === 'preview'
      ? 'Setup previewed locally.'
      : 'Module setup saved.')
  }

  const handleRatingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const day = weeklyDraft.days[ratingForm.dayIndex]
    if (!day || !ratingForm.itemName) return

    const timingState = getMealTimingState(day.date, ratingForm.mealType, mealTimings)
    if (!timingState.canRate) {
      setStatus(`${titleCase(ratingForm.mealType)} ratings open at ${getMealTiming(ratingForm.mealType, mealTimings)?.startLabel ?? 'meal start'}.`)
      return
    }

    const rating: MenuRating = {
      campus_id: campusId,
      user_id: userId,
      date: day.date,
      day_name: day.day_name,
      meal_type: ratingForm.mealType,
      item_name: ratingForm.itemName,
      rating: Number(ratingForm.rating),
      comment: ratingForm.comment,
    }
    try {
      setStatus('Saving rating...')
      const response = await submitMenuRating(rating, role, designations)
      setWorkspace((current) => ({
        ...current,
        ratings: [...(current.ratings ?? []), response.data ?? rating],
      }))
      setRatingForm((current) => ({ ...current, comment: '' }))
      setStatus(response.status === 'preview' ? 'Rating previewed locally.' : 'Rating saved.')
    } catch (error) {
      setWorkspace((current) => ({
        ...current,
        ratings: [...(current.ratings ?? []), rating],
      }))
      setStatus('Rating saved locally. The connected service returned an unexpected response.')
    }
  }

  const handleSickMealSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const day = weeklyDraft.days[sickMealForm.dayIndex]
    if (!day || !sickMealForm.reason || !sickMealForm.deliveryLocation || !sickMealForm.contactNumber) return

    const request: SickMealRequest = {
      campus_id: campusId,
      user_id: userId,
      date: day.date,
      meal_type: sickMealForm.mealType,
      reason: sickMealForm.reason,
      delivery_location: sickMealForm.deliveryLocation,
      contact_number: sickMealForm.contactNumber,
      notes: sickMealForm.notes,
    }
    try {
      setStatus('Submitting sick meal request...')
      const response = await submitSickMeal(request, role, designations)
      setWorkspace((current) => ({
        ...current,
        sick_meals: response.data ? [...(current.sick_meals ?? []), response.data] : current.sick_meals,
      }))
      setSickMealForm((current) => ({
        ...current,
        reason: '',
        deliveryLocation: '',
        contactNumber: '',
        notes: '',
      }))
      setStatus(response.status === 'preview' ? 'Sick meal previewed locally.' : 'Sick meal submitted.')
    } catch (error) {
      setStatus('Could not submit the sick meal request. Please try again.')
    }
  }

  const handleFeedbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const day = weeklyDraft.days[feedbackForm.dayIndex]
    if (!feedbackForm.message) return

    const request: MenuFeedbackRequest = {
      campus_id: campusId,
      user_id: userId,
      category: feedbackForm.category,
      message: feedbackForm.message,
      date: day?.date,
      meal_type: feedbackForm.mealType,
      item_name: feedbackForm.itemName,
    }
    try {
      setStatus('Sending feedback...')
      const response = await submitMenuFeedback(request, role, designations)
      setWorkspace((current) => ({
        ...current,
        feedback: response.data ? [...(current.feedback ?? []), response.data] : current.feedback,
      }))
      setFeedbackForm((current) => ({ ...current, message: '' }))
      setStatus(response.status === 'preview' ? 'Feedback previewed locally.' : 'Feedback sent.')
    } catch (error) {
      setStatus('Could not send feedback. Please try again.')
    }
  }

  const updateWeeklyMeal = (items: string[]) => {
    const updated = cloneWeeklyMenu(weeklyDraft)
    const day = updated.days[committeeDayIndex]
    if (!day) return weeklyDraft

    const mealIndex = day.meals.findIndex((meal) => meal.meal_type === committeeMealType)
    if (mealIndex >= 0) {
      day.meals[mealIndex] = { ...day.meals[mealIndex], items }
    } else {
      day.meals.push({ meal_type: committeeMealType, items })
    }
    return updated
  }

  const handleCommitteeSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage) return

    const items = committeeItems
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
    const updated = updateWeeklyMeal(items)
    setWeeklyDraft(updated)
    setStatus('Saving weekly menu...')
    const response = await saveWeeklyMenu(updated, role, designations)
    setWorkspace((current) => ({
      ...current,
      weekly_menu: response.data ?? updated,
    }))
    setStatus(response.status === 'preview' ? 'Menu update previewed locally.' : 'Weekly menu saved.')
  }

  const handleExcelUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !canManage) return

    setStatus('Importing Excel menu...')
    const response = await importMenuExcel(file, campusId, weeklyDraft.week_start, role, designations)
    if (response.data) {
      setWeeklyDraft(cloneWeeklyMenu(response.data))
      setWorkspace((current) => ({
        ...current,
        weekly_menu: response.data ?? current.weekly_menu,
      }))
    }
    setStatus(response.status === 'preview'
      ? response.message ?? 'Excel import previewed locally.'
      : 'Excel menu imported.')
    event.target.value = ''
  }

  const updateTimingDraft = (
    mealType: MenuMealType,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setTimingDrafts((current) => current.map((draft) => (
      draft.mealType === mealType
        ? { ...draft, [field]: value }
        : draft
    )))
  }

  const handleTimingsSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage) return

    const updatedTimings = draftsToTimings(timingDrafts)
    const invalidTiming = updatedTimings.find((timing) => timing.startMinute >= timing.endMinute)
    if (invalidTiming) {
      setStatus(`${invalidTiming.label} end time must be after the start time.`)
      return
    }

    setStatus('Saving meal timings...')
    const response = await saveMenuTimings(campusId, updatedTimings, role, designations)
    const savedTimings = response.data ?? updatedTimings
    setMealTimings(savedTimings)
    setTimingDrafts(timingsToDrafts(savedTimings))
    setWorkspace((current) => ({
      ...current,
      meal_timings: savedTimings,
    }))
    setStatus(response.status === 'preview'
      ? 'Meal timings previewed locally.'
      : 'Meal timings saved.')
  }

  const renderSetup = () => (
    <form className="menu-setup" onSubmit={handleConfigSave}>
      <div className="menu-section-heading">
        <div>
          <span>Module Setup</span>
          <h3>Menu Source</h3>
        </div>
        <strong>{configDraft.mode === 'default_app' ? 'Default App' : 'Website'}</strong>
      </div>

      <div className="menu-setup-options" role="group" aria-label="Menu module source">
        <button
          className={configDraft.mode === 'external_website' ? 'active' : ''}
          onClick={() => setConfigDraft((current) => ({ ...current, mode: 'external_website' }))}
          type="button"
        >
          Add a website
        </button>
        <button
          className={configDraft.mode === 'default_app' ? 'active' : ''}
          onClick={() => setConfigDraft((current) => ({ ...current, mode: 'default_app' }))}
          type="button"
        >
          Add Default App
        </button>
      </div>

      <label>
        Website
        <input
          onChange={(event) => setConfigDraft((current) => ({ ...current, source_url: event.target.value }))}
          placeholder="foodcommittee.iiitb.ac.in"
          type="text"
          value={configDraft.source_url ?? ''}
        />
      </label>

      <label className="menu-toggle">
        <input
          checked={configDraft.is_active}
          onChange={(event) => setConfigDraft((current) => ({ ...current, is_active: event.target.checked }))}
          type="checkbox"
        />
        Active
      </label>

      <button type="submit">Save Setup</button>
    </form>
  )

  const renderExternalWebsite = () => (
    <section className="menu-external">
      <div>
        <span>Website Source</span>
        <h3>{configDraft.source_url || 'foodcommittee.iiitb.ac.in'}</h3>
      </div>
      {externalUrl && (
        <a href={externalUrl} rel="noreferrer" target="_blank">
          Open Website
        </a>
      )}
    </section>
  )

  const renderRateableItem = (
    dayIndex: number,
    day: MenuWeekDay,
    mealType: string,
    item: string,
  ) => {
    const timingState = getMealTimingState(day.date, mealType, mealTimings)
    return (
      <button
        className={`menu-item-button ${timingState.status}`}
        disabled={!timingState.canRate}
        key={`${day.date}-${mealType}-${item}`}
        onClick={() => chooseItemForRating(dayIndex, mealType, item)}
        title={timingState.canRate ? `Rate ${item}` : timingState.label}
        type="button"
      >
        <span>{item}</span>
        <em>{timingState.label}</em>
      </button>
    )
  }

  const selectedDailyDay = weeklyDraft.days[dailyDayIndex] ?? weeklyDraft.days[0]

  const renderDailyMenu = () => (
    <div className="menu-daily-layout">
      <section className="menu-day-selector">
        <div className="menu-section-heading">
          <div>
            <span>Daily Menu</span>
            <h3>{selectedDailyDay ? `${selectedDailyDay.day_name}, ${formatDate(selectedDailyDay.date)}` : 'No menu'}</h3>
          </div>
        </div>
        <div className="menu-day-switcher" role="group" aria-label="Choose menu day">
          {weeklyDraft.days.map((day, index) => (
            <button
              className={index === dailyDayIndex ? 'active' : ''}
              key={day.date}
              onClick={() => setDailyDayIndex(index)}
              type="button"
            >
              <span>{day.day_name.slice(0, 3)}</span>
              <strong>{formatDate(day.date)}</strong>
            </button>
          ))}
        </div>
      </section>

      {selectedDailyDay && (
        <div className="menu-daily-grid">
          {selectedDailyDay.meals.map((meal) => {
            const timing = getMealTiming(meal.meal_type, mealTimings)
            const timingState = getMealTimingState(selectedDailyDay.date, meal.meal_type, mealTimings)
            return (
              <article className="menu-daily-meal" key={`${selectedDailyDay.date}-${meal.meal_type}`}>
                <div className="menu-daily-meal-head">
                  <div>
                    <span>{timing?.startLabel} - {timing?.endLabel}</span>
                    <h4>{timing?.label ?? titleCase(meal.meal_type)}</h4>
                  </div>
                  <strong className={timingState.status}>{timingState.label}</strong>
                </div>
                <div className="menu-item-button-grid">
                  {meal.items.map((item) => renderRateableItem(
                    dailyDayIndex,
                    selectedDailyDay,
                    meal.meal_type,
                    item,
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderWeeklyMenu = () => (
    <div className="menu-week-grid">
      {weeklyDraft.days.map((day, dayIndex) => (
        <article className="menu-day-card" key={day.date}>
          <div className="menu-day-head">
            <span>{day.day_name}</span>
            <strong>{formatDate(day.date)}</strong>
          </div>
          {day.meals.map((meal) => (
            <section className="menu-meal-block" key={`${day.date}-${meal.meal_type}`}>
              <h4>{titleCase(meal.meal_type)}</h4>
              <ul>
                {meal.items.map((item) => (
                  <li key={`${day.date}-${meal.meal_type}-${item}`}>
                    {renderRateableItem(dayIndex, day, meal.meal_type, item)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      ))}
    </div>
  )

  const selectedRatingDay = weeklyDraft.days[ratingForm.dayIndex]
  const selectedRatingMeal = mealForDay(selectedRatingDay, ratingForm.mealType)
  const selectedRatingTimingState = selectedRatingDay
    ? getMealTimingState(selectedRatingDay.date, ratingForm.mealType, mealTimings)
    : { canRate: false, label: 'Choose a day', status: 'upcoming' as const }
  const selectedFeedbackDay = weeklyDraft.days[feedbackForm.dayIndex]
  const selectedFeedbackMeal = mealForDay(selectedFeedbackDay, feedbackForm.mealType)

  const renderRatings = () => (
    <div className="menu-two-column">
      <form className="menu-form" onSubmit={handleRatingSubmit}>
        <div className="menu-section-heading">
          <div>
            <span>Ratings</span>
            <h3>Rate an Item</h3>
          </div>
        </div>
        <label>
          Day
          <select
            onChange={(event) => setRatingForm((current) => ({
              ...current,
              dayIndex: Number(event.target.value),
              itemName: firstItem(weeklyDraft.days[Number(event.target.value)], current.mealType),
            }))}
            value={ratingForm.dayIndex}
          >
            {weeklyDraft.days.map((day, index) => (
              <option key={day.date} value={index}>{day.day_name}</option>
            ))}
          </select>
        </label>
        <label>
          Meal
          <select
            onChange={(event) => setRatingForm((current) => ({
              ...current,
              mealType: event.target.value,
              itemName: firstItem(selectedRatingDay, event.target.value),
            }))}
            value={ratingForm.mealType}
          >
            {(selectedRatingDay?.meals ?? []).map((meal) => (
              <option key={meal.meal_type} value={meal.meal_type}>{titleCase(meal.meal_type)}</option>
            ))}
          </select>
        </label>
        <label>
          Item
          <select
            onChange={(event) => setRatingForm((current) => ({ ...current, itemName: event.target.value }))}
            value={ratingForm.itemName}
          >
            {(selectedRatingMeal?.items ?? []).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="menu-rating-picker" aria-label="Rateable menu items">
          <span>Tap an item</span>
          <div className="menu-item-button-grid">
            {(selectedRatingMeal?.items ?? []).map((item) => selectedRatingDay
              ? renderRateableItem(ratingForm.dayIndex, selectedRatingDay, ratingForm.mealType, item)
              : null)}
          </div>
        </div>
        <label>
          Rating
          <select
            onChange={(event) => setRatingForm((current) => ({ ...current, rating: event.target.value }))}
            value={ratingForm.rating}
          >
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Okay</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Bad</option>
          </select>
        </label>
        <label>
          Comment
          <textarea
            onChange={(event) => setRatingForm((current) => ({ ...current, comment: event.target.value }))}
            rows={3}
            value={ratingForm.comment}
          />
        </label>
        {!selectedRatingTimingState.canRate && (
          <p className="menu-rate-lock">{selectedRatingTimingState.label}</p>
        )}
        <button disabled={!ratingForm.itemName || !selectedRatingTimingState.canRate} type="submit">Submit Rating</button>
      </form>

      <section className="menu-list-panel">
        <div className="menu-section-heading">
          <div>
            <span>Food Committee</span>
            <h3>Rating Summary</h3>
          </div>
        </div>
        <div className="menu-compact-list">
          {summary.length === 0 && <p>No ratings yet.</p>}
          {summary.slice(0, 8).map((item) => (
            <article key={`${item.date}-${item.meal_type}-${item.item_name}`}>
              <div>
                <strong>{item.item_name}</strong>
                <span>{item.day_name} / {titleCase(item.meal_type)}</span>
              </div>
              <b>{item.average.toFixed(1)}</b>
            </article>
          ))}
        </div>
      </section>
    </div>
  )

  const renderSickMeals = () => (
    <div className="menu-two-column">
      <form className="menu-form" onSubmit={handleSickMealSubmit}>
        <div className="menu-section-heading">
          <div>
            <span>Sick Meals</span>
            <h3>Request Meal</h3>
          </div>
        </div>
        <label>
          Day
          <select
            onChange={(event) => setSickMealForm((current) => ({ ...current, dayIndex: Number(event.target.value) }))}
            value={sickMealForm.dayIndex}
          >
            {weeklyDraft.days.map((day, index) => (
              <option key={day.date} value={index}>{day.day_name}</option>
            ))}
          </select>
        </label>
        <label>
          Meal
          <select
            onChange={(event) => setSickMealForm((current) => ({ ...current, mealType: event.target.value }))}
            value={sickMealForm.mealType}
          >
            {MEAL_TYPES.map((meal) => (
              <option key={meal} value={meal}>{titleCase(meal)}</option>
            ))}
          </select>
        </label>
        <label>
          Reason
          <input
            onChange={(event) => setSickMealForm((current) => ({ ...current, reason: event.target.value }))}
            value={sickMealForm.reason}
          />
        </label>
        <label>
          Delivery Location
          <input
            onChange={(event) => setSickMealForm((current) => ({ ...current, deliveryLocation: event.target.value }))}
            value={sickMealForm.deliveryLocation}
          />
        </label>
        <label>
          Contact Number
          <input
            onChange={(event) => setSickMealForm((current) => ({ ...current, contactNumber: event.target.value }))}
            value={sickMealForm.contactNumber}
          />
        </label>
        <label>
          Notes
          <textarea
            onChange={(event) => setSickMealForm((current) => ({ ...current, notes: event.target.value }))}
            rows={3}
            value={sickMealForm.notes}
          />
        </label>
        <button type="submit">Submit Sick Meal</button>
      </form>

      <section className="menu-list-panel">
        <div className="menu-section-heading">
          <div>
            <span>Queue</span>
            <h3>Sick Meals</h3>
          </div>
        </div>
        <div className="menu-compact-list">
          {workspace.sick_meals.length === 0 && <p>No sick meal requests.</p>}
          {workspace.sick_meals.slice(-6).reverse().map((request) => (
            <article key={request.id}>
              <div>
                <strong>{formatDate(request.date)} / {titleCase(request.meal_type)}</strong>
                <span>{request.delivery_location}</span>
              </div>
              <b>{request.status}</b>
            </article>
          ))}
        </div>
      </section>
    </div>
  )

  const renderFeedback = () => (
    <div className="menu-two-column">
      <form className="menu-form" onSubmit={handleFeedbackSubmit}>
        <div className="menu-section-heading">
          <div>
            <span>Feedback</span>
            <h3>Send Feedback</h3>
          </div>
        </div>
        <label>
          Category
          <select
            onChange={(event) => setFeedbackForm((current) => ({ ...current, category: event.target.value }))}
            value={feedbackForm.category}
          >
            <option value="quality">Quality</option>
            <option value="quantity">Quantity</option>
            <option value="hygiene">Hygiene</option>
            <option value="service">Service</option>
            <option value="suggestion">Suggestion</option>
          </select>
        </label>
        <label>
          Day
          <select
            onChange={(event) => setFeedbackForm((current) => ({
              ...current,
              dayIndex: Number(event.target.value),
              itemName: firstItem(weeklyDraft.days[Number(event.target.value)], current.mealType),
            }))}
            value={feedbackForm.dayIndex}
          >
            {weeklyDraft.days.map((day, index) => (
              <option key={day.date} value={index}>{day.day_name}</option>
            ))}
          </select>
        </label>
        <label>
          Meal
          <select
            onChange={(event) => setFeedbackForm((current) => ({
              ...current,
              mealType: event.target.value,
              itemName: firstItem(selectedFeedbackDay, event.target.value),
            }))}
            value={feedbackForm.mealType}
          >
            {(selectedFeedbackDay?.meals ?? []).map((meal) => (
              <option key={meal.meal_type} value={meal.meal_type}>{titleCase(meal.meal_type)}</option>
            ))}
          </select>
        </label>
        <label>
          Item
          <select
            onChange={(event) => setFeedbackForm((current) => ({ ...current, itemName: event.target.value }))}
            value={feedbackForm.itemName}
          >
            {(selectedFeedbackMeal?.items ?? []).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Message
          <textarea
            onChange={(event) => setFeedbackForm((current) => ({ ...current, message: event.target.value }))}
            rows={5}
            value={feedbackForm.message}
          />
        </label>
        <button disabled={!feedbackForm.message} type="submit">Send Feedback</button>
      </form>

      <section className="menu-list-panel">
        <div className="menu-section-heading">
          <div>
            <span>Food Committee</span>
            <h3>Feedback Inbox</h3>
          </div>
        </div>
        <div className="menu-compact-list">
          {workspace.feedback.length === 0 && <p>No feedback yet.</p>}
          {workspace.feedback.slice(-6).reverse().map((feedback) => (
            <article key={feedback.id}>
              <div>
                <strong>{titleCase(feedback.category)}</strong>
                <span>{feedback.message}</span>
              </div>
              <b>{feedback.status}</b>
            </article>
          ))}
        </div>
      </section>
    </div>
  )

  const renderCommittee = () => (
    <div className="menu-two-column">
      <div className="menu-committee-stack">
        <form className="menu-form" onSubmit={handleCommitteeSave}>
          <div className="menu-section-heading">
            <div>
              <span>Upload</span>
              <h3>Weekly Menu</h3>
            </div>
          </div>
          {workspace.reminder && (
            <div className={`menu-reminder ${workspace.reminder.is_due ? 'due' : ''}`}>
              <strong>{workspace.reminder.title}</strong>
              <span>{workspace.reminder.body}</span>
            </div>
          )}
          <label>
            Menu Sheet
            <input
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleExcelUpload}
              type="file"
            />
          </label>
          <label>
            Day
            <select
              onChange={(event) => setCommitteeDayIndex(Number(event.target.value))}
              value={committeeDayIndex}
            >
              {weeklyDraft.days.map((day, index) => (
                <option key={day.date} value={index}>{day.day_name}</option>
              ))}
            </select>
          </label>
          <label>
            Meal
            <select
              onChange={(event) => setCommitteeMealType(event.target.value)}
              value={committeeMealType}
            >
              {MEAL_TYPES.map((meal) => (
                <option key={meal} value={meal}>{titleCase(meal)}</option>
              ))}
            </select>
          </label>
          <label>
            Items
            <textarea
              onChange={(event) => setCommitteeItems(event.target.value)}
              rows={9}
              value={committeeItems}
            />
          </label>
          <button type="submit">Save Menu Items</button>
        </form>

        <form className="menu-form" onSubmit={handleTimingsSave}>
          <div className="menu-section-heading">
            <div>
              <span>Schedule</span>
              <h3>Meal Timings</h3>
            </div>
          </div>
          <div className="menu-timing-editor">
            {timingDrafts.map((timing) => (
              <fieldset key={timing.mealType}>
                <legend>{timing.label}</legend>
                <label>
                  Starts
                  <input
                    onChange={(event) => updateTimingDraft(timing.mealType, 'startTime', event.target.value)}
                    type="time"
                    value={timing.startTime}
                  />
                </label>
                <label>
                  Ends
                  <input
                    onChange={(event) => updateTimingDraft(timing.mealType, 'endTime', event.target.value)}
                    type="time"
                    value={timing.endTime}
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <button type="submit">Save Meal Timings</button>
        </form>
      </div>

      <section className="menu-list-panel">
        <div className="menu-section-heading">
          <div>
            <span>Operations</span>
            <h3>Latest Signals</h3>
          </div>
        </div>
        <div className="menu-metric-grid">
          <div>
            <strong>{workspace.ratings.length}</strong>
            <span>Ratings</span>
          </div>
          <div>
            <strong>{workspace.sick_meals.length}</strong>
            <span>Sick Meals</span>
          </div>
          <div>
            <strong>{workspace.feedback.length}</strong>
            <span>Feedback</span>
          </div>
        </div>
        <div className="menu-compact-list">
          {summary.slice(0, 4).map((item) => (
            <article key={`${item.date}-${item.meal_type}-${item.item_name}`}>
              <div>
                <strong>{item.item_name}</strong>
                <span>{item.day_name} / {titleCase(item.meal_type)}</span>
              </div>
              <b>{item.average.toFixed(1)}</b>
            </article>
          ))}
        </div>
      </section>
    </div>
  )

  const renderTimings = () => (
    <section className="menu-timings-panel">
      <div className="menu-section-heading">
        <div>
          <span>Timings</span>
          <h3>Meal Windows</h3>
        </div>
      </div>
      <div className="menu-timings-grid">
        {mealTimings.map((meal) => (
          <article key={meal.mealType}>
            <span>{meal.label}</span>
            <strong>{meal.startLabel} - {meal.endLabel}</strong>
          </article>
        ))}
      </div>
    </section>
  )

  const renderActiveTab = () => {
    if (activeTab === 'daily') return renderDailyMenu()
    if (activeTab === 'ratings') return renderRatings()
    if (activeTab === 'sickMeals') return renderSickMeals()
    if (activeTab === 'feedback') return renderFeedback()
    if (activeTab === 'timings') return renderTimings()
    if (activeTab === 'committee' && canManage) return renderCommittee()
    return renderWeeklyMenu()
  }

  return (
    <section className="menu-panel" aria-label="Menu module">
      <div className="menu-header">
        <div>
          <span>Default App</span>
          <h2>Foode</h2>
        </div>
        <div className="menu-header-meta">
          <strong>{isLoading ? 'Loading' : `Week of ${formatDate(weeklyDraft.week_start)}`}</strong>
          <em>{canManage ? 'Committee Access' : 'Student Access'}</em>
        </div>
      </div>

      {canConfigure && renderSetup()}

      {configDraft.mode === 'external_website' ? (
        renderExternalWebsite()
      ) : (
        <>
          <nav className="menu-tabs" aria-label="Menu sections">
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.id ? 'active' : ''}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="menu-tab-body">
            {renderActiveTab()}
          </div>
        </>
      )}

      {status && <p className="menu-status">{status}</p>}
    </section>
  )
}

export default MenuWidget
