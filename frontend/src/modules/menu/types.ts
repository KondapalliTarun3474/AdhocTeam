export type MenuModuleMode = 'external_website' | 'default_app'
export type MenuMealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner'
export type MenuTab = 'daily' | 'weekly' | 'ratings' | 'sickMeals' | 'feedback' | 'timings' | 'committee'

export interface MenuMeal {
  meal_type: MenuMealType | string
  items: string[]
}

export interface MenuMealTiming {
  mealType: MenuMealType
  label: string
  startLabel: string
  endLabel: string
  startMinute: number
  endMinute: number
}

export interface MenuWeekDay {
  date: string
  day_name: string
  meals: MenuMeal[]
}

export interface WeeklyMenu {
  campus_id: string
  week_start: string
  days: MenuWeekDay[]
  imported_from?: string | null
  last_updated_at?: string | null
}

export interface MenuSetupConfig {
  campus_id: string
  module_key: 'menu'
  mode: MenuModuleMode
  source_url?: string | null
  is_active: boolean
  last_synced_at?: string | null
}

export interface MenuRating {
  campus_id: string
  user_id: string
  date: string
  day_name: string
  meal_type: string
  item_name: string
  rating: number
  comment?: string
}

export interface MenuRatingSummary {
  date: string
  day_name: string
  meal_type: string
  item_name: string
  average_rating: number
  rating_count: number
}

export interface SickMealRequest {
  campus_id: string
  user_id: string
  date: string
  meal_type: string
  reason: string
  delivery_location: string
  contact_number: string
  notes?: string
}

export interface SickMealRecord extends SickMealRequest {
  id: string
  status: string
  created_at: string
}

export interface MenuFeedbackRequest {
  campus_id: string
  user_id: string
  category: string
  message: string
  date?: string
  meal_type?: string
  item_name?: string
}

export interface MenuFeedbackRecord extends MenuFeedbackRequest {
  id: string
  status: string
  created_at: string
}

export interface MenuReminder {
  is_due: boolean
  title: string
  body: string
}

export interface MenuWorkspace {
  config: MenuSetupConfig
  weekly_menu: WeeklyMenu
  ratings: MenuRating[]
  rating_summary: MenuRatingSummary[]
  sick_meals: SickMealRecord[]
  feedback: MenuFeedbackRecord[]
  meal_timings: MenuMealTiming[]
  reminder?: MenuReminder | null
}
