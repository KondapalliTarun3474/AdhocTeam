from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class MenuModuleMode(str, Enum):
    EXTERNAL_WEBSITE = "external_website"
    DEFAULT_APP = "default_app"


class MealType(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    SNACKS = "snacks"
    DINNER = "dinner"


class MealSchema(BaseModel):
    meal_type: str
    items: List[str]


class MenuDaySchema(BaseModel):
    campus_id: str
    date: str
    meals: List[MealSchema]


class MenuWeekDaySchema(BaseModel):
    date: str
    day_name: str
    meals: List[MealSchema]


class WeeklyMenuSchema(BaseModel):
    campus_id: str
    week_start: str
    days: List[MenuWeekDaySchema]
    imported_from: Optional[str] = None
    last_updated_at: Optional[str] = None


class MenuSetupConfig(BaseModel):
    campus_id: str
    module_key: str = "menu"
    mode: MenuModuleMode = MenuModuleMode.DEFAULT_APP
    source_url: Optional[str] = None
    is_active: bool = True
    last_synced_at: Optional[str] = None


class MenuConfigUpdateRequest(BaseModel):
    campus_id: str
    mode: MenuModuleMode
    source_url: Optional[str] = None
    is_active: bool = True


class MenuSyncRequest(BaseModel):
    campus_id: str
    source_url: Optional[str] = None


class MenuUpdateRequest(BaseModel):
    campus_id: str
    date: str
    meals: List[MealSchema]


class WeeklyMenuUpdateRequest(BaseModel):
    campus_id: str
    week_start: str
    days: List[MenuWeekDaySchema]
    imported_from: Optional[str] = None


class MenuReviewRequest(BaseModel):
    campus_id: str
    user_id: str
    date: str
    meal_type: str
    dish_name: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class MenuRatingRequest(BaseModel):
    campus_id: str
    user_id: str
    date: str
    day_name: str
    meal_type: str
    item_name: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class MenuRatingSummary(BaseModel):
    date: str
    day_name: str
    meal_type: str
    item_name: str
    average_rating: float
    rating_count: int


class SickMealRequest(BaseModel):
    campus_id: str
    user_id: str
    date: str
    meal_type: str
    reason: str
    delivery_location: str
    contact_number: str
    notes: Optional[str] = None


class SickMealRecord(SickMealRequest):
    id: str
    status: str = "requested"
    created_at: str


class SickMealStatusUpdate(BaseModel):
    status: str


class MenuFeedbackRequest(BaseModel):
    campus_id: str
    user_id: str
    category: str
    message: str
    date: Optional[str] = None
    meal_type: Optional[str] = None
    item_name: Optional[str] = None


class MenuFeedbackRecord(MenuFeedbackRequest):
    id: str
    status: str = "open"
    created_at: str


class MenuFeedbackStatusUpdate(BaseModel):
    status: str


class MenuTimingSchema(BaseModel):
    meal_type: str
    label: str
    start_label: str
    end_label: str
    start_minute: int = Field(ge=0, le=1439)
    end_minute: int = Field(ge=0, le=1439)


class MenuTimingUpdateRequest(BaseModel):
    campus_id: str
    timings: List[MenuTimingSchema]


class MenuReminder(BaseModel):
    is_due: bool
    title: str
    body: str


class MenuWorkspaceSchema(BaseModel):
    config: MenuSetupConfig
    weekly_menu: WeeklyMenuSchema
    ratings: List[MenuRatingRequest]
    rating_summary: List[MenuRatingSummary]
    sick_meals: List[SickMealRecord]
    feedback: List[MenuFeedbackRecord]
    meal_timings: List[MenuTimingSchema]
    reminder: Optional[MenuReminder] = None
