# Hyper-Detailed Tool Docstrings Plan

This plan updates the docstrings for all 7 tools to give the 70B model extreme clarity on exactly **what** each tool does, **when** to use it, and its **limitations**. 

Please review these drafted descriptions. If they look good, I will inject them straight into the Python `@tool` definitions!

## 🍱 Food Menu Module (`modules/menu/tools.py`)

### 1. `get_daily_menu`
```text
Fetch the campus food menu for a specific date (YYYY-MM-DD), or today if no date is provided.
WHAT IT RETURNS: A list of food items served for breakfast, lunch, snacks, and dinner.
WHEN TO USE: 
- When the user asks "What's for lunch?" or "What is on the menu today?"
- MANDATORY PRE-CHECK: You must call this tool BEFORE submitting any food ratings to find the exact, correct spelling and casing of the dish on the menu.
```

### 2. `get_past_food_ratings`
```text
Get all past food ratings (1-5 stars) and comments submitted by this specific user.
WHAT IT RETURNS: A historical list of items the user has rated in the past.
WHEN TO USE: 
- When the user asks "What did I rate the sambar?"
- When advising a user on whether they should skip a meal. You can use this to see if they historically liked or disliked the items currently on today's menu.
```

### 3. `submit_food_rating`
```text
Submit a star rating (1-5) and an optional comment for a specific food item to the database.
WHAT IT WRITES: Creates or updates a rating record in the database.
WHEN TO USE: ONLY when the user explicitly asks to rate a food item.
CONSTRAINTS: 
- You MUST ask the user for a 1-5 star rating before calling this if they didn't provide one.
- You MUST use the exact item spelling found in `get_daily_menu`.
```

---

## 🏫 Campus Rooms Module (`modules/campus_rooms/tools.py`)

### 4. `get_room_bookings_and_courses`
```text
Get all scheduled courses, classes, and room bookings for the campus.
WHAT IT RETURNS: A schedule of times and locations for the student's classes.
WHEN TO USE:
- When the user asks "What classes do I have tomorrow?"
- When the user is planning an outing or applying for a leave. You must check their schedule to warn them if they will miss any upcoming classes.
```

---

## 🚪 Campus Leave Module (`modules/campus_leave/tools.py`)

### 5. `get_student_profile`
```text
Get the student's profile information, specifically their curfew violations and emergency contacts.
WHAT IT RETURNS: The student's name, phone, and total number of 'curfew_violations'.
WHEN TO USE:
- When the user is planning a "Casual Outing" (like going to the mall, skipping dinner, or running an errand).
- You must check their curfew_violations. If they have 4 or more, warn them they must return before 10:30 PM.
```

### 6. `check_leave_status`
```text
Check if the student currently has an active or pending formal leave application.
WHAT IT RETURNS: The details of their current leave (if any).
WHEN TO USE: When the user asks "Was my leave approved?" or "Do I have any active leaves?"
```

### 7. `apply_for_campus_leave`
```text
Submit a formal leave application (gate-pass) to the database.
WHAT IT WRITES: Creates a new leave request pending approval.
WHEN TO USE: ONLY when the user explicitly asks to "apply for leave", "go home for the weekend", or "take a medical leave".
CONSTRAINTS:
- NEVER use this tool for a "Casual Outing" (like going to the mall or grabbing dinner).
- If the user is missing required details (dates, destination, reason, guardian email/phone), you MUST ask them for the missing info before calling this tool.
```
