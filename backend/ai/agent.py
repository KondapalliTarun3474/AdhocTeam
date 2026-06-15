import os
from datetime import datetime
from typing import List, Callable, Dict

from core.module_registry import discover_modules
from modules.menu.service import DEFAULT_CAMPUS_ID

try:
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_groq import ChatGroq
    from langchain_core.chat_history import InMemoryChatMessageHistory
    from langchain_core.runnables.history import RunnableWithMessageHistory
except ImportError:
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
        return "The AI assistant is currently offline because LangChain/Groq is not configured."

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

You have access to several tools across different campus modules (Food Menu, Room Bookings, Leave Applications, Past Ratings).
Use these tools to gather information or perform actions on behalf of the user.

CRITICAL RULES:
1. AUTONOMY & INTELLIGENCE: You are a smart, autonomous campus assistant. When a user asks a question or makes a request, use your reasoning to deduce which tools to call. You will often need to call multiple tools sequentially to build a complete, helpful answer.
2. CASUAL OUTINGS VS FORMAL LEAVES (BUSINESS LOGIC): 
   - A "Formal Leave" is for overnight stays, going home, or medical emergencies. 
   - A "Casual Outing" is going to the mall, skipping a meal, or a quick errand. Casual outings DO NOT require a leave application. 
3. NEVER AUTO-SUBMIT: You are strictly forbidden from calling `apply_for_campus_leave` or `submit_food_rating` unless the user explicitly asks you to "apply" or "submit" it, AND you have asked for their final confirmation.
4. HOLISTIC CONTEXT & FILTERING: Always consider the big picture constraints (classes, curfew). When checking past food ratings against a specific meal (e.g., lunch), you MUST silently filter the ratings. NEVER mention or suggest an item from past ratings if it is NOT on today's menu for that specific meal. The user only cares about what is available *right now*. Synthesize data from multiple tools to provide intelligent, highly filtered responses.
5. TOOL EXECUTION: You must actually execute the tools to get data. Do not output raw JSON or `<function>` tags to the user. Wait for the tool to return data before giving your final answer.
6. GENERIC ANTI-HALLUCINATION & MISSING INFO: You are strictly forbidden from populating fake, dummy, or inferred data into ANY tool. If a tool requires information (like a destination, a reason, an emergency contact, or a numeric rating) and the user did not explicitly provide it in their prompt, you MUST halt and ask the user for that specific missing info. NEVER guess or make up data just to complete a tool call.
7. EXPLICIT CONFIRMATION FOR WRITES: You are STRICTLY FORBIDDEN from calling `submit_campus_leave_application` or `submit_food_rating` unless the user has explicitly confirmed the exact details. If they ask you to apply for a leave, you MUST FIRST use `draft_campus_leave_application` to generate a draft. You must then show this draft to the user and ask "Do you confirm this application?". ONLY call `submit_campus_leave_application` after they reply "Yes".
8. STRICT ERROR HANDLING: If a tool returns a string starting with "ERROR:" or "DRAFT GENERATED", you MUST NOT tell the user the action was successful. You MUST pass the exact message back to the user and halt the action. Do not lie or hallucinate success.
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
