# Campus Copilot: Connector Architecture & Implementation Blueprint

## 1. Core Architecture Principles (CRITICAL FOR NEW CONNECTORS)

This repository uses an **Asynchronous Cached Architecture**. To ensure parallel development without merge conflicts, all AI agents and developers MUST adhere to the following strict principles when adding new connectors (e.g., ERP, LMS, Events).

### Principle A: Strict Connector Isolation
Connectors are self-contained "plugins". 
- They **do not** touch the frontend files.
- They **do not** modify `ai/agent.py` directly unless adding a simple isolated route.
- They **must** be placed in their own folder under `backend/connectors/<name>/`.
- They **must** have their own standalone `sync.py` script.

### Principle B: Campus-Level Caching (`campus_id`)
We DO NOT track global data by `user_id`. Data like food menus or academic calendars are identical for all students on a campus.
- **Rule:** All database tables created by new connectors MUST use `campus_id` (UUID) as the primary organizational key.
- **Rule:** All tables MUST have a composite unique index (e.g., `(campus_id, date, meal_type)`) to allow idempotent UPSERTs (`ON CONFLICT DO UPDATE`) when the scheduler runs.

### Principle C: Universal Parsing is Phase 4
*Note for AI Agents:* Do NOT implement the Universal LLM scraper/parser yet. For the current MVP phase, all connectors must rely on reading static `.json` files (e.g., `default.json` mapping directly to the DB). The LLM scraper is reserved for the final hackathon phase.

---

## 2. Recommended Folder Structure

When building a new connector, clone the structure of the existing `mess` connector exactly.

```text
src/
├── frontend/             # React + Vite Frontend (DO NOT TOUCH from backend)
├── backend/              # FastAPI Backend (Python)
│   ├── main.py           # Register new sync endpoints here
│   ├── database.py       # Shared Supabase client
│   ├── default.json      # Current mock data source for Phase 1
│   ├── ai/
│   │   └── agent.py      # Stable LCEL LangChain routing
│   └── connectors/
│       ├── base.py       # BaseConnector abstract classes
│       ├── mess/         # ---> EXISTING CONNECTOR <---
│       │   ├── schema.py 
│       │   ├── fetcher.py
│       │   └── sync.py   
│       └── erp/          # ---> NEW CONNECTORS GO HERE <---
```

---

## 3. End-to-End Flow

1. **Setup:** Campus Admin/First Student sets up the connector via UI. A row is created in `connector_configs`.
2. **Scheduling:** A background worker (`apscheduler` or external cron) queries `connector_configs` every 6 hours for active connectors.
3. **Execution:** The scheduler calls the specific connector's sync function (e.g., `connectors.mess.sync.run(config)`).
4. **Fetch:** `fetcher.py` executes. (For MVP, it just reads `default.json`).
5. **Parse:** `parser.py` maps the raw JSON directly to Pydantic schemas. (In Phase 4, this will use GPT-4o-mini structured output to extract data from messy HTML).
6. **Store:** `sync.py` performs an UPSERT to the Supabase tables using the `campus_id`.
7. **Query:** Student asks "What's for lunch?" 
8. **Resolve:** AI agent uses the database fetching tool, reads from local cache tables, and responds instantly.

---

## 4. How to Build a New Connector (Step-by-Step)

If an AI agent is instructed to build a new connector (e.g., `events`), it must follow these exact steps sequentially to avoid merge conflicts:

### Step 1: Database Schema
1. Open Supabase SQL editor.
2. Create a new table (e.g., `events`).
3. Add `campus_id` (UUID).
4. Add a Composite Unique Key to prevent duplicate rows during syncs.
5. Disable RLS (Row Level Security) for the hackathon MVP so the backend `service_role` key can write freely.

### Step 2: The Connector Module
Create `backend/connectors/<new_name>/sync.py`.
It must expose a `sync_<name>_data(config, supabase)` function that:
1. Reads from the source (e.g., a static JSON file).
2. Uses `supabase.table("table_name").upsert(data).execute()`.

### Step 3: API Registration
Open `backend/main.py`.
1. Add a trigger endpoint: `@app.post("/api/admin/sync/<name>")`.
2. This endpoint must call the `sync.py` function created in Step 2.

### Step 4: AI Agent Integration
Open `backend/ai/agent.py`.
1. We use **LangChain Expression Language (LCEL)** for hackathon stability, NOT the brittle `AgentExecutor` loop.
2. Create a specific data-fetching Python function (e.g., `get_events_for_date`).
3. Add an `elif` block in the intent router inside the `chat_with_agent` function to detect the new topic.
4. Pass the fetched raw data directly into the LLM prompt and use `StrOutputParser()`.

---

## 5. AI Integration Standard (LCEL)

*AI Agents: Do not revert `agent.py` to use `AgentType.OPENAI_FUNCTIONS`, `create_react_agent`, or `create_tool_calling_agent`. We strictly use manual LCEL routing for hackathon stability.*

```python
# Standard Pattern for agent.py additions:
if any(keyword in msg_lower for keyword in ["event", "festival", "holiday"]):
    # 1. Fetch raw data natively from Supabase
    raw_data = get_events_data(current_date)
    
    # 2. Inject it into a simple LCEL chain
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Answer the student's question based ONLY on this data:\n{data}"),
        ("human", "{input}")
    ])
    chain = prompt | llm | StrOutputParser()
    return chain.invoke({"data": raw_data, "input": message})
```

---

## 6. API Design

Expose these on FastAPI (`main.py`):

* `POST /api/connectors/setup`
  * Body: `{ campus_id, type: "mess", mode: "scraper", url: "..." }`
* `POST /api/admin/sync/{connector_name}`
  * Triggers the sync immediately (Crucial for the live demo to show the data populating).
* `POST /api/chat`
  * Body: `{ user_id, message: "What's for lunch?" }`
  * Returns AI response.

---

## 7. Engineering Roadmap (Hackathon Phasing)

**Phase 1: DB & Core Pipeline (Completed)**
* Setup Supabase tables with composite unique constraints and `campus_id`.
* Create `BaseConnector` pattern.
* Scaffold React + Vite frontend.

**Phase 2: The Default Connector (Completed)**
* Built `mess/fetcher.py` and `mess/sync.py`.
* Implemented Mode 1 (Mock JSON).
* Created the manual `/api/admin/sync/mess` trigger.

**Phase 3: AI Routing (Completed)**
* Setup Groq Llama 3 LCEL chains in `/api/chat`.
* Bind the data fetchers natively to bypass brittle Agent loops.

**Phase 4: Parallel Connectors & Universal LLM Parser (Current/Next)**
* **Teammates:** Build ERP, LMS, and Events connectors using the Step-by-Step blueprint above.
* **Parser Upgrade:** Implement the universal LLM parser to scrape messy websites (Mode 2/3) using Structured Outputs instead of relying on `default.json`. 

---

## 8. Technology Stack Context (Do Not Deviate)
- **Frontend:** React + Vite (Vanilla CSS, Glassmorphism UI)
- **Backend:** FastAPI (Python 3.8 compatible)
- **Database:** Supabase (PostgreSQL)
- **AI:** LangChain + Groq (Llama 3.1 8b instant) - *Do not attempt to use OpenAI or Gemini packages due to quota limitations and Python version constraints on the host machine.*
