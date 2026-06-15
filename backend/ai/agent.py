import os
from datetime import datetime
from typing import List, Callable, Dict

from core.module_registry import discover_modules
from modules.menu.service import DEFAULT_CAMPUS_ID

import_error_msg = None
try:
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_groq import ChatGroq
    from langchain_core.chat_history import InMemoryChatMessageHistory
    from langchain_core.runnables.history import RunnableWithMessageHistory
except ImportError as e:
    import traceback
    import_error_msg = traceback.format_exc()
    ChatGroq = None


SESSION_STORE: Dict[str, InMemoryChatMessageHistory] = {}

def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in SESSION_STORE:
        SESSION_STORE[session_id] = InMemoryChatMessageHistory()
    return SESSION_STORE[session_id]


def _get_all_tools() -> List[Callable]:
    tools = []
    for module in discover_modules():
        if module.agent_tools:
            tools.extend(module.agent_tools)
    return tools


def chat_with_agent(
    message: str,
    campus_id: str = DEFAULT_CAMPUS_ID,
    user_id: str = "demo-student",
    role: str = "student",
) -> str:
    """
    CampusBuddy LangChain Agent using Groq, dynamic tool discovery, and session memory.
    """
    if not os.environ.get("GROQ_API_KEY") or not ChatGroq:
        import sys
        key_status = "present" if os.environ.get("GROQ_API_KEY") else "MISSING"
        chatgroq_status = "present" if ChatGroq else f"MISSING. Reason:\n{import_error_msg}"
        return f"DEBUG -> Key: {key_status} | ChatGroq: {chatgroq_status} | Python: {sys.executable}"

    try:
        tools = _get_all_tools()
        llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile")
        
        from datetime import timedelta
        current_date_obj = datetime.now()
        current_time_str = current_date_obj.isoformat()
        tomorrow_date_str = (current_date_obj + timedelta(days=1)).strftime('%Y-%m-%d')
        
        system_prompt = f"""You are CampusBuddy, an intelligent, helpful AI assistant for university students.
Current Date & Time: {current_time_str}
Tomorrow's Date: {tomorrow_date_str}
User ID: {user_id}
User Role: {role}

You have access to tools across campus modules: Food Menu, Room Bookings, Leave Applications, ERP course registration and personal academic calendar, LMS assignments, Exam Portal quizzes and scores, Announcements, and past ratings.
Use these tools to gather information or perform actions on behalf of the user.

CRITICAL RULES:
1. CASUAL OUTINGS VS FORMAL LEAVES: A "Formal Leave" is for overnight stays or home visits. A "Casual Outing" is a quick errand (no leave application needed). Warn users with 4+ curfew violations to return by 10:30 PM.
2. STRICT CONFIRMATION: You are strictly forbidden from calling `submit_campus_leave_application` or `submit_food_rating` without explicitly confirming the exact details with the user first. Always use `draft_campus_leave_application` first.
3. ACADEMIC BOUNDARIES: For personal schedules/classes, use `get_personal_academic_calendar`. For global campus room availability, use `get_room_bookings_and_courses`. For deadlines, use `get_lms_assignments`.
4. FILTERING: When checking past food ratings against today's menu, SILENTLY filter the ratings. Never mention an item if it's not on the menu today. Ensure exact item spelling.
5. NO PARALLEL TOOLS: You are strictly forbidden from outputting multiple tool calls at once. If a user asks a broad question OR explicitly asks you to do multiple tasks in one sentence (e.g., "apply for leave AND check classes"), you MUST pick ONLY ONE tool to execute first. Do NOT attempt to check both simultaneously. Handle the first task, then tell the user you will do the second task next.
6. SERIALIZED FOLLOW-UP: If a query logically requires checking multiple systems, you MUST serialize it. Check the most critical system first (e.g., classes). Then, at the end of your response, explicitly ask the user: "Would you also like me to check your assignment deadlines or recent campus announcements?" Wait for their 'yes' before executing the next tool.
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        
        agent_with_chat_history = RunnableWithMessageHistory(
            agent_executor,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )

        result = agent_with_chat_history.invoke(
            {"input": message},
            config={"configurable": {"session_id": user_id}}
        )
        return result["output"]

    except Exception as e:
        import traceback
        traceback.print_exc()
        failed_gen = getattr(e, "failed_generation", "No failed generation detail")
        return f"Error connecting to CampusBuddy AI: {str(e)} \n\nDetailed Generation Error:\n{failed_gen}"
