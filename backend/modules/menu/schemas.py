from typing import List, Optional

from pydantic import BaseModel, Field


class MealSchema(BaseModel):
    meal_type: str
    items: List[str]


class MenuDaySchema(BaseModel):
    campus_id: str
    date: str
    meals: List[MealSchema]


class MenuSyncRequest(BaseModel):
    campus_id: str
    source_url: Optional[str] = None


class MenuUpdateRequest(BaseModel):
    campus_id: str
    date: str
    meals: List[MealSchema]


class MenuReviewRequest(BaseModel):
    campus_id: str
    user_id: str
    date: str
    meal_type: str
    dish_name: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
