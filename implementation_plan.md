# Food Menu Connector: Implementation Blueprint

## 1. Architecture Review & Validation

Your **Asynchronous Cached Architecture** is fundamentally sound and the correct choice for a hackathon. It guarantees low-latency AI responses, prevents rate-limiting issues with campus portals, and enables proactive notifications.

**Validation & Minor Pivot:**
You proposed that every campus's unique API/Website format requires parsing. Writing custom regex or BeautifulSoup logic for every new campus is a massive time sink and breaks the "plug-and-play" vision. 
* **Improvement:** We will use **LLM-Based Parsing (Structured Outputs)** during the background sync phase. Instead of writing code to parse Campus A's weird JSON and Campus B's messy HTML, we feed the raw fetch payload into a fast model (GPT-4o-mini) and ask it to output our strict `MealSchema`. This turns the parser into a universal adapter.

* **Database Pivot:** Your schema tracks meals by `user_id`. Since a Food Menu is generally identical for all students at the same campus, syncing it per user is inefficient. We should introduce a `campus_id` (or `tenant_id`) and sync the menu *once per campus*. Users then belong to a campus.

---

## 2. Recommended Folder Structure

We enforce strict isolation. The AI, DB, and Scheduler are shared. The connectors are self-contained "plugins."

```text
src/
├── app/                  # Next.js Frontend
├── backend/              # FastAPI Backend (Python)
│   ├── main.py
│   ├── database.py       # Supabase client & shared DB logic
│   ├── scheduler.py      # apscheduler setup (runs syncs)
│   ├── ai/
│   │   ├── agent.py      # LangChain / OpenAI logic
│   │   └── tools.py      # DB querying tools exposed to the LLM
│   └── connectors/
│       ├── __init__.py
│       ├── base.py       # BaseConnector abstract classes
│       ├── mess/         # ---> SELF CONTAINED CONNECTOR <---
│       │   ├── __init__.py
│       │   ├── schema.py # Pydantic models for Meal
│       │   ├── fetcher.py# Logic for Mode 1, 2, 3 fetching
│       │   ├── parser.py # Universal LLM-based normalizer
│       │   └── sync.py   # The entrypoint called by the scheduler
│       └── erp/          # (Future)
```

---

## 3. End-to-End Flow

1. **Setup:** Campus Admin/First Student sets up the connector via UI. A row is created in `connector_configs`.
2. **Scheduling:** The background worker (`apscheduler`) queries `connector_configs` every 6 hours for active connectors.
3. **Execution:** `scheduler.py` calls `connectors.mess.sync.run(config)`.
4. **Fetch:** `fetcher.py` executes Mode 1 (Read JSON), Mode 2 (GET API), or Mode 3 (Scrape HTML) based on config.
5. **Parse:** `parser.py` takes the raw text/JSON. If Mode 1, it maps directly. If Mode 2/3, it uses GPT-4o-mini structured output to extract the menu into `MealSchema`.
6. **Store:** `sync.py` performs an UPSERT to the Supabase `meals` table.
7. **Query:** Student asks "What's for lunch?" 
8. **Resolve:** AI agent uses `get_menu_from_db(date)` tool, fetches from local `meals` table, and responds instantly.

---

## 4. Connector Implementation Design

### Abstract Interface (`base.py`)
```python
from abc import ABC, abstractmethod
from pydantic import BaseModel

class BaseConnector(ABC):
    @abstractmethod
    def fetch(self, config: dict) -> str: pass
    
    @abstractmethod
    def parse(self, raw_data: str) -> list[BaseModel]: pass
    
    @abstractmethod
    def sync(self, config: dict) -> bool: pass
```

### Modes & Parsing (`mess/fetcher.py` & `parser.py`)
* **Mode 1 (Default JSON):** `fetch()` reads a local JSON file or a static S3 link. `parse()` maps it directly to Pydantic.
* **Mode 2 (Campus API):** `fetch()` runs `requests.get()`. Returns raw JSON string.
* **Mode 3 (Website Scraper):** `fetch()` runs `requests.get()` and extracts `<body>.text` (strip HTML tags to save tokens).

**Universal Parser (`parser.py`):**
To avoid writing custom code for Mode 2/3, we use OpenAI Structured Outputs:
```python
# Pseudo-code for parser.py
from pydantic import BaseModel

class MealSchema(BaseModel):
    meal_type: str # 'breakfast', 'lunch', 'dinner'
    items: list[str]

def parse_with_llm(raw_text: str) -> list[MealSchema]:
    # Use GPT-4o-mini with response_format=MealSchema
    # Prompt: "Extract the food menu for today from the following raw text."
    pass
```

---

## 5. Database Validation

Using Supabase PostgreSQL.

### Table: `connector_configs`
* Change `user_id` to `campus_id` (UUID).
* Add `last_synced_at` (Timestamp).

### Table: `meals`
* Change `user_id` to `campus_id` (UUID).
* Add `date` (Date).
* Add `meal_type` (String).
* Add `items` (JSONB).
* Add `raw_payload` (Text) - store for debugging.
* **Crucial Indexes:** 
  * Composite Unique Index on `(campus_id, date, meal_type)`. This allows us to use `ON CONFLICT DO UPDATE` (Upsert) during syncs, preventing duplicates.
  * Index on `date` for fast querying.

---

## 6. Background Sync Design

**Do not use Celery or Redis for a hackathon.** It's overengineering and a pain to host.

**Recommendation:** Use `apscheduler` running as a background thread inside your FastAPI app, OR simply expose a POST endpoint (`/api/admin/sync_all`) and use a free external Cron service (like Vercel Cron or cron-job.org) to hit it every hour.

**External Cron is best for Hackathons:**
1. No thread management in Python.
2. Serverless friendly.
3. Easy to trigger manually for demos.

**Failure Handling:** Wrap the sync logic in a `try/except`. If `fetch()` fails (e.g., campus site is down), log the error and do not overwrite the existing DB data.

---

## 7. API Design

Expose these on FastAPI:

* `POST /api/connectors/setup`
  * Body: `{ campus_id, type: "mess", mode: "scraper", url: "..." }`
* `POST /api/admin/sync/{connector_name}`
  * Triggers the sync immediately (Crucial for the live demo to show the data populating).
* `GET /api/meals?campus_id=123&date=YYYY-MM-DD`
  * Returns normalized JSON from DB.
* `POST /api/chat`
  * Body: `{ user_id, message: "What's for lunch?" }`
  * Returns AI response.

---

## 8. AI Integration Flow

1. **System Prompt:** "You are Campus Copilot. The user is at Campus ID 123. The current time is 10:00 AM."
2. **Tools Provided:** `get_menu(date: str, meal_type: Optional[str])`.
3. **Execution:** 
   * Student: "What's for lunch?"
   * LLM detects intent and calls `get_menu(date="2024-05-10", meal_type="lunch")`.
   * FastAPI intercepts tool call, queries the Supabase `meals` table using the fast API.
   * FastAPI returns `["paneer", "rice"]` to the LLM.
   * LLM Generates: "For lunch today, they are serving paneer and rice! Enjoy your meal."

---

## 9. Engineering Roadmap (Hackathon Phasing)

**Phase 1: DB & Schemas (Hours 0-4)**
* Setup Supabase tables with unique constraints.
* Write Pydantic models.
* Create `/api/meals` GET endpoint.

**Phase 2: The Connector Core (Hours 4-12)**
* Build `mess/fetcher.py` and `mess/parser.py`.
* Implement Mode 1 (Mock JSON).
* Implement the universal LLM parser for Mode 2/3.
* Create the manual `/api/admin/sync/mess` trigger.

**Phase 3: AI Integration (Hours 12-20)**
* Setup OpenAI function calling in `/api/chat`.
* Bind the `get_menu` tool to read from the DB.

**Phase 4: Frontend & Voice (Hours 20-36)**
* Build Next.js UI.
* Connect to `/api/chat`.
* Polish UI animations.

---

## 10. Risks + Tradeoffs

1. **Tradeoff (LLM Parser Cost):** Using an LLM to parse scraped HTML costs API tokens. However, because we only do this asynchronously in the background (e.g., once a day for a menu), the cost is negligible, and the latency doesn't impact the student.
2. **Risk (Malformed HTML):** If the campus website uses heavy JavaScript rendering (React/SPA), a simple `requests.get()` won't see the text.
   * *Mitigation:* For the hackathon, ensure the demo website you scrape is statically rendered. If needed, use a fast headless browser API (like Browserless.io) instead of raw `requests`, but avoid setting up Selenium locally.

## User Review Required

Please review the shift from `user_id` to `campus_id` for synced data, and the proposal to use **LLM Structured Outputs** as the universal parser. These two changes will save you 10+ hours of debugging and data-mapping during the hackathon. 

Does this detailed blueprint meet your expectations to begin execution?
