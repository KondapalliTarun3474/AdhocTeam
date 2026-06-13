from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_supabase
from connectors.mess.sync import sync_mess_menu
from ai.agent import chat_with_agent

app = FastAPI(title="Campus Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Campus Copilot API running"}

@app.post("/api/admin/sync/mess")
def trigger_mess_sync(campus_id: str):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    config = {
        "campus_id": campus_id,
        "source_url": "default.json"
    }
    
    try:
        success = sync_mess_menu(config, supabase)
        if success:
            return {"status": "success", "message": "Synced mess menu successfully"}
        return {"status": "error", "message": "Failed to sync all meals"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/meals")
def get_meals(campus_id: str, date: str):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    response = supabase.table("meals").select("*").eq("campus_id", campus_id).eq("date", date).execute()
    return {"data": response.data}

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
def chat(request: ChatRequest):
    response = chat_with_agent(request.message)
    return {"reply": response}
