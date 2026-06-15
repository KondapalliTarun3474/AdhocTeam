import os
from datetime import datetime
from typing import List, Callable

from core.module_registry import discover_modules
from modules.menu.service import DEFAULT_CAMPUS_ID

try:
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None


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
    CampusBuddy LangChain Agent using Groq and dynamic tool discovery.
    """
    if not os.environ.get("GROQ_API_KEY") or not ChatGroq:
        return "The AI assistant is currently offline because LangChain/Groq is not configured."

    try:
        tools = _get_all_tools()
        llm = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant")
        
        from datetime import timedelta
        current_date_obj = datetime.now()
        current_time_str = current_date_obj.isoformat()
        tomorrow_date_str = (current_date_obj + timedelta(days=1)).strftime('%Y-%m-%d')
        
        system_prompt = f"""You are CampusBuddy, an intelligent, helpful AI assistant for university students.
Current Date & Time: {current_time_str}
Tomorrow's Date: {tomorrow_date_str}
User ID: {user_id}
User Role: {role}

You have access to several tools across different campus modules (Food Menu, Room Bookings, Leave Applications).
Use these tools to gather information or perform actions on behalf of the user.

CRITICAL RULES:
1. DATES: Always use the exact dates provided above when checking for "today" or "tomorrow".
2. LEAVES VS CASUAL OUTINGS: 
   - FORMAL LEAVE: If the user says "apply for leave" or "I am going home", this is a Formal Leave. ONLY for Formal Leaves, you must check their classes using `get_room_bookings_and_courses` and apply using `apply_for_campus_leave`.
   - CASUAL OUTING: If the user says they are going for "dinner", "shopping", or coming back late tonight, this is a Casual Outing. NEVER check class schedules for casual outings. NEVER apply for leave for casual outings.
3. CURFEW ADVICE (CASUAL OUTINGS): Curfew is 10:30 PM. For casual outings, you MUST call the `get_student_profile` tool to see how many "curfew_violations" the user has. You MUST explicitly tell the user their current number of violations in your response. If they have 4 or more, warn them strictly.
4. CONFIRM ACTIONS: If you successfully use a tool to create or submit something, you MUST explicitly tell the user that the action was successfully completed in your final response.
5. Do not invent data. If a tool returns an error or no data, inform the user honestly.
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

        result = agent_executor.invoke({"input": message})
        return result["output"]

    except Exception as e:
        return f"Error connecting to CampusBuddy AI: {str(e)}"
