import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { submitMenuReview, updateMenu } from '../../api/client'
import type { Meal, MenuDay, ModuleWidgetProps, Role } from '../../types/campus'
import './MenuWidget.css'

const MANAGER_ROLES = new Set<Role>(['food_committee', 'admin'])

function cloneMeals(menu?: MenuDay): Meal[] {
  return menu?.meals?.map((meal) => ({
    meal_type: meal.meal_type,
    items: [...meal.items],
  })) ?? []
}

interface DishOption {
  dish: string
  meal_type: string
}

function MenuWidget({ campusId, isLoading, overview, role, userId }: ModuleWidgetProps) {
  const menu = overview?.menu
  const [draftMeals, setDraftMeals] = useState<Meal[]>([])
  const [selectedDish, setSelectedDish] = useState('')
  const [rating, setRating] = useState('5')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('')

  const canManage = MANAGER_ROLES.has(role)
  const canReview = role === 'student'
  const menuDate = menu?.date ?? new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const meals = cloneMeals(menu)
    setDraftMeals(meals)
    setSelectedDish(meals[0]?.items[0] ?? '')
  }, [menu])

  const dishOptions = useMemo<DishOption[]>(() => {
    return draftMeals.flatMap((meal) => (
      meal.items.map((dish) => ({
        dish,
        meal_type: meal.meal_type,
      }))
    ))
  }, [draftMeals])

  const selectedMealType = dishOptions.find((item) => item.dish === selectedDish)?.meal_type ?? 'lunch'

  const handleMealChange = (mealType: string, value: string) => {
    setDraftMeals((current) => current.map((meal) => (
      meal.meal_type === mealType
        ? { ...meal, items: value.split(',').map((item) => item.trim()).filter(Boolean) }
        : meal
    )))
  }

  const handleSaveMenu = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('Saving menu update...')
    const response = await updateMenu({
      campus_id: campusId,
      date: menuDate,
      meals: draftMeals,
    }, role)

    setStatus(response.status === 'preview'
      ? 'Preview saved locally. Start the backend to persist it.'
      : 'Menu update saved.')
  }

  const handleReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('Submitting review...')
    const response = await submitMenuReview({
      campus_id: campusId,
      user_id: userId,
      date: menuDate,
      meal_type: selectedMealType,
      dish_name: selectedDish,
      rating: Number(rating),
      comment,
    }, role)

    setStatus(response.status === 'preview'
      ? 'Review captured locally. Backend persistence is offline.'
      : 'Review submitted.')
    setComment('')
  }

  return (
    <section className="menu-panel" aria-label="Menu module">
      <div className="menu-header">
        <div>
          <span>Connected Module</span>
          <h2>Menu</h2>
        </div>
        <strong>{isLoading ? 'Loading' : menuDate}</strong>
      </div>

      <div className="menu-meal-grid">
        {draftMeals.map((meal) => (
          <article className="menu-meal-card" key={meal.meal_type}>
            <h3>{meal.meal_type}</h3>
            <ul>
              {meal.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {canReview && (
        <form className="menu-action" onSubmit={handleReview}>
          <div>
            <h3>Review a Dish</h3>
            <p>Students can rate dishes without seeing committee controls.</p>
          </div>
          <label>
            Dish
            <select value={selectedDish} onChange={(event) => setSelectedDish(event.target.value)}>
              {dishOptions.map((option) => (
                <option key={`${option.meal_type}-${option.dish}`} value={option.dish}>
                  {option.dish}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rating
            <select value={rating} onChange={(event) => setRating(event.target.value)}>
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
              onChange={(event) => setComment(event.target.value)}
              placeholder="Short feedback for the food committee"
              rows={3}
              value={comment}
            />
          </label>
          <button disabled={!selectedDish} type="submit">Submit Review</button>
        </form>
      )}

      {canManage && (
        <form className="menu-action manager" onSubmit={handleSaveMenu}>
          <div>
            <h3>Manage Menu</h3>
            <p>Food committee and admins can update meals. Each module owns its own workflow.</p>
          </div>
          {draftMeals.map((meal) => (
            <label key={meal.meal_type}>
              {meal.meal_type}
              <textarea
                onChange={(event) => handleMealChange(meal.meal_type, event.target.value)}
                rows={2}
                value={meal.items.join(', ')}
              />
            </label>
          ))}
          <button disabled={draftMeals.length === 0} type="submit">Save Menu</button>
        </form>
      )}

      {role === 'admin' && (
        <div className="menu-admin-note">
          Admin role can assign module access centrally through the RBAC API.
        </div>
      )}

      {status && <p className="menu-status">{status}</p>}
    </section>
  )
}

export default MenuWidget
