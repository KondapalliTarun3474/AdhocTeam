import os
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv(override=True)

from ai.agent import chat_with_agent

def test():
    try:
        response1 = chat_with_agent(
            message="i want to skip dinner and go to a movie tonight, will i miss anything?",
            user_id="demo-student",
            role="student"
        )
        print("AGENT RESPONSE 1:\n", response1)
    except Exception as e:
        print("EXCEPTION RAISED:")
        if hasattr(e, 'body'):
            print("ERROR BODY:", e.body)
        if hasattr(e, 'message'):
            print("ERROR MESSAGE:", e.message)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
