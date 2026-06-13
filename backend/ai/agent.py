from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
from datetime import date

from database import get_supabase

def get_meals_for_date(target_date: str) -> str:
    """Useful to get the food or mess menu for a specific date."""
    supabase = get_supabase()
    if not supabase:
        return "Database is not connected."
        
    campus_id = "00000000-0000-0000-0000-000000000000"
    
    response = supabase.table("meals").select("meal_type, items").eq("campus_id", campus_id).eq("date", target_date).execute()
    
    if not response.data:
        return f"No menu found for {target_date}."
        
    result = []
    for row in response.data:
        items = ", ".join(row['items'])
        result.append(f"{row['meal_type'].capitalize()}: {items}")
        
    return "\n".join(result)

def chat_with_agent(message: str) -> str:
    """
    Hackathon-optimized intelligent routing. 
    Instead of using brittle Agent loops that often get stuck with smaller models, 
    we use a stable LangChain Expression Language (LCEL) chain.
    """
    if not os.environ.get("GROQ_API_KEY"):
        return "GROQ API Key is not set."
        
    try:
        llm = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant")
        msg_lower = message.lower()
        current_date = date.today().isoformat()
        
        # Intent checking
        if any(keyword in msg_lower for keyword in ["lunch", "dinner", "breakfast", "menu", "food", "eat"]):
            # 1. Fetch data directly
            raw_menu = get_meals_for_date(current_date)
            
            # 2. Use LangChain to format it beautifully
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are the Campus Copilot. Use the raw menu data provided below to answer the user's question in a friendly, conversational tone. Do not output JSON. Just tell them what they want to know based on the menu.\n\nRaw Menu Data:\n{menu_data}"),
                ("human", "{input}")
            ])
            
            chain = prompt | llm | StrOutputParser()
            return chain.invoke({"menu_data": raw_menu, "input": message})
            
        else:
            # General casual chat
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are the Campus Copilot. Help the student with their campus life in a friendly way."),
                ("human", "{input}")
            ])
            chain = prompt | llm | StrOutputParser()
            return chain.invoke({"input": message})
            
    except Exception as e:
        return f"Error: {str(e)}"
