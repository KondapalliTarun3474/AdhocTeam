from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai.agent import chat_with_agent
from core.module_registry import discover_modules
from core.router import router as rbac_router
from modules.hub.router import router as hub_router
from modules.menu.service import DEFAULT_CAMPUS_ID, get_menu_for_date


app = FastAPI(title="CampusBuddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hub_router)
app.include_router(rbac_router)

for campus_module in discover_modules():
    if campus_module.router:
        app.include_router(campus_module.router)

@app.get("/")
def read_root():
    return {
        "message": "CampusBuddy API running",
        "modules": ["hub", "rbac"] + [module.key for module in discover_modules()],
    }


# Legacy alias while clients move to /api/modules/menu.
@app.get("/api/meals")
def get_meals(campus_id: str, date: str):
    menu = get_menu_for_date(campus_id=campus_id, target_date=date)
    return {"data": menu.dict()}

class ChatRequest(BaseModel):
    message: str
    campus_id: str = DEFAULT_CAMPUS_ID
    user_id: str = "demo-student"
    role: str = "student"

@app.post("/api/chat")
def chat(request: ChatRequest):
    response = chat_with_agent(
        request.message,
        campus_id=request.campus_id,
        role=request.role,
    )
    return {"reply": response}
