from ai.agent import chat_with_agent

print("Testing agent...")
response = chat_with_agent(
    "What's for lunch today?",
    campus_id="00000000-0000-0000-0000-000000000000",
    role="student",
)
print("Output:", response)
