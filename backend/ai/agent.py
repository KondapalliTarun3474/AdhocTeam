import os
from datetime import date

from modules.menu.service import DEFAULT_CAMPUS_ID, format_menu_for_assistant

try:
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None
    ChatPromptTemplate = None
    StrOutputParser = None


MENU_KEYWORDS = {"lunch", "dinner", "breakfast", "menu", "food", "eat", "dish"}


def _fallback_response(message: str, menu_context: str) -> str:
    msg_lower = message.lower()
    if any(keyword in msg_lower for keyword in MENU_KEYWORDS):
        return menu_context
    return (
        "I can help with campus updates, calendar context, and module data. "
        "The LangChain Groq runtime is not configured yet, so I am returning "
        "deterministic module responses for now."
    )


def chat_with_agent(
    message: str,
    campus_id: str = DEFAULT_CAMPUS_ID,
    role: str = "student",
) -> str:
    """
    Hackathon-stable LCEL routing.
    Each module exposes plain data functions; the chain only formats that data.
    """
    current_date = date.today().isoformat()
    menu_context = format_menu_for_assistant(campus_id, current_date)
    msg_lower = message.lower()

    if not os.environ.get("GROQ_API_KEY") or not ChatGroq:
        return _fallback_response(message, menu_context)

    try:
        llm = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant")
        if any(keyword in msg_lower for keyword in MENU_KEYWORDS):
            prompt = ChatPromptTemplate.from_messages([
                (
                    "system",
                    "You are CampusBuddy, a campus assistant. The user's role is {role}. "
                    "Answer only from this Menu module data. Do not invent unavailable dishes.\n\n"
                    "{menu_context}",
                ),
                ("human", "{input}")
            ])
            chain = prompt | llm | StrOutputParser()
            return chain.invoke({
                "role": role,
                "menu_context": menu_context,
                "input": message,
            })

        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are CampusBuddy, a concise campus hub assistant. "
                "Explain what the hub can do and ask which module the user wants.",
            ),
            ("human", "{input}")
        ])
        chain = prompt | llm | StrOutputParser()
        return chain.invoke({"input": message})

    except Exception as e:
        return f"Error: {str(e)}"
