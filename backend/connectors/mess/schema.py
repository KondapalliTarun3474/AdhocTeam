from pydantic import BaseModel
from typing import List

class MealSchema(BaseModel):
    meal_type: str # 'breakfast', 'lunch', 'dinner'
    items: List[str]

class MessMenuSchema(BaseModel):
    date: str
    meals: List[MealSchema]
