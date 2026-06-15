# campuz Module Development Guide

This guide is for agents and teammates building modules from separate devices. Follow it closely to keep modules pluggable and avoid merge conflicts.

## Why TypeScript Now

The frontend is now TypeScript-first because this project will have many independently developed modules. TypeScript helps catch integration mistakes before runtime:

- A module cannot silently return the wrong hub payload shape.
- Role strings are checked against the shared `Role` union.
- Student, professor, and staff designations are checked against the shared `Designation` union.
- Widget props are shared through `ModuleWidgetProps`.
- API responses such as `HubOverview`, `MenuDay`, and `CalendarItem` are documented in code.
- Future app packaging as a PWA or native shell is easier when contracts are explicit.

Keep the TypeScript simple. Type shared data contracts strongly, let local UI state infer where possible, and avoid building elaborate generic abstractions before the module flow is proven.

## How To Describe The Next Module

When a new module is requested, describe it with this shape. Short answers are fine, but these fields prevent architecture drift.

```text
Module name:
Module key:
Primary users/roles:
Designations:
What students can do:
What staff/committee/professors/designated students can do:
What admins can do:
Data source for MVP:
Pages/widgets needed now:
Hub notifications/updates/calendar items:
Assistant questions it should answer:
Anything explicitly out of scope:
```

Example:

```text
Module name: Menu
Module key: menu
Primary users/roles: student, admin
Designations: food_committee
What students can do: view meals, rate items, request sick meals, send feedback
What food committee can do: upload weekly Excel menus, update meals, read ratings, read sick meal requests, read feedback
What admins can do: configure website/default app source, assign roles/designations, moderate all data
Data source for MVP: IIITB Excel import plus module-local fallback JSON
Pages/widgets needed now: setup selector, weekly menu, ratings, sick meals, feedback, committee editor
Hub notifications/updates/calendar items: weekly menu published, upload reminder before Monday
Assistant questions it should answer: what's for lunch, what is for dinner
Anything explicitly out of scope: payment, inventory
```

## Why The Module Refactor Helps

The repo is designed for parallel module development. Menu/Foode, Campus Room Tracker, Leave Application, LMS, ERP, Exam LMS, and future apps should be built in their own folders.

The refactor helps because:

- Backend routers are discovered from `backend/modules/<module_key>/module.py`.
- Frontend widgets are discovered from `frontend/src/modules/<module_key>/manifest.ts`.
- The hub aggregates module summaries and data instead of owning module internals.
- Shared RBAC stays centralized while module workflows stay isolated.
- Future module work should rarely touch `backend/main.py`, `frontend/src/App.tsx`, or the hub shell.

Exception: Personal Calendar and standalone AI Chat are Hub-owned surfaces, not modules. Do not create `frontend/src/modules/calendar/manifest.ts` or `frontend/src/modules/chat/manifest.ts` for them.

## Current Directory Structure

```text
backend/
  ai/
    agent.py
  core/
    __init__.py
    module_registry.py
    rbac.py
    router.py
  modules/
    __init__.py
    hub/
      __init__.py
      router.py
      service.py
    menu/
      __init__.py
      default_menu.json
      default_weekly_menu.json
      fetcher.py
      module.py
      router.py
      schemas.py
      service.py
    campus_rooms/
      __init__.py
      module.py
      router.py
      schemas.py
      service.py
    campus_leave/
      __init__.py
      module.py
      router.py
      schemas.py
      service.py
    academics/
      __init__.py
      default_courses.json
      schemas.py
      service.py
    erp/
      __init__.py
      module.py
      router.py
      schemas.py
      service.py
      tools.py
    lms/
      __init__.py
      module.py
      router.py
      schemas.py
      service.py
      tools.py
    exam_lms/
      __init__.py
      module.py
      router.py
      schemas.py
      service.py
      tools.py
    announcements/
      __init__.py
      module.py
      router.py
      schemas.py
      service.py
      tools.py
  database.py
  main.py
  requirements.txt
  schema.sql
```

Do not commit local environments:

```text
backend/venv/
frontend/node_modules/
frontend/dist/
```

These are ignored and should stay local.

```text
frontend/src/
  api/
    client.ts
  design/
    theme.css
  modules/
    registry.ts
    assistant/
      AssistantPanel.css
      AssistantPanel.tsx
    hub/
      HubDashboard.css
      HubDashboard.tsx
      HubCalendarPage.css
      HubCalendarPage.tsx
      HubAssistantPage.css
      HubAssistantPage.tsx
      hubCalendar.ts
    menu/
      api.ts
      defaultMenu.ts
      manifest.ts
      MenuGlance.css
      MenuGlance.tsx
      MenuWidget.css
      MenuWidget.tsx
      timings.ts
      types.ts
    campus_rooms/
      api.ts
      CampusRooms.css
      CampusRoomsGlance.tsx
      CampusRoomsPage.tsx
      defaultRooms.ts
      manifest.ts
      types.ts
    campus_leave/
      api.ts
      CampusLeave.css
      CampusLeaveGlance.tsx
      CampusLeavePage.tsx
      defaultLeave.ts
      manifest.ts
      types.ts
    academics/
      catalog.ts
      defaultCourses.json
      types.ts
    erp/
      api.ts
      Erp.css
      ErpGlance.tsx
      ErpPage.tsx
      manifest.ts
      types.ts
    lms/
      api.ts
      Lms.css
      LmsGlance.tsx
      LmsPage.tsx
      manifest.ts
      types.ts
    exam_lms/
      api.ts
      Exam.css
      ExamGlance.tsx
      ExamPage.tsx
      manifest.ts
      types.ts
    announcements/
      Announcements.css
      AnnouncementsGlance.tsx
      AnnouncementsPage.tsx
      api.ts
      manifest.ts
      types.ts
  types/
    campus.ts
  App.css
  App.tsx
  index.css
  main.tsx
  vite-env.d.ts
```

## Expected Structure For A New Module

Example module key: `lms`.

```text
backend/modules/lms/
  __init__.py
  module.py
  router.py
  schemas.py
  service.py
  tools.py                  # optional assistant tools
  default_lms.json        # optional static MVP data

frontend/src/modules/lms/
  manifest.ts
  LmsGlance.tsx          # dashboard summary only
  LmsGlance.css
  LmsPage.tsx            # full module workflow
  LmsPage.css
  api.ts                 # optional module-local frontend API helper
  types.ts               # optional module-local types
  defaultLms.ts           # optional module-local seed/mock data
```

Use lowercase snake case for module folders and keys:

- `menu`
- `campus_rooms`
- `campus_leave`
- `lms`
- `erp`
- `exam_lms`
- `announcements`

Use PascalCase for React components:

- `MenuWidget`
- `LmsGlance`
- `LmsPage`
- `ExamLmsGlance`
- `ExamLmsPage`
- `AnnouncementsGlance`
- `AnnouncementsPage`

## Backend Module Contract

Every backend module must expose `MODULE` from `module.py`.

```python
from core.module_registry import CampusModule
from core.rbac import Role
from modules.lms.router import router


MODULE = CampusModule(
    key="lms",
    name="LMS",
    status="connected",
    summary="Courses, assignments, materials, and TA workflows.",
    roles=(Role.STUDENT, Role.PROFESSOR, Role.ADMIN),
    designations=(Designation.TEACHING_ASSISTANT,),
    router=router,
)
```

If the module contributes dashboard data, add a hub provider:

```python
def lms_hub_provider(campus_id, user_id, role, today, designations):
    return {
        "module_data": {
            "lms": {
                "pending_assignments": [],
                "next_class": None,
            }
        }
    }


MODULE = CampusModule(
    key="lms",
    name="LMS",
    status="connected",
    summary="Courses, assignments, materials, and TA workflows.",
    roles=(Role.STUDENT, Role.PROFESSOR, Role.ADMIN),
    designations=(Designation.TEACHING_ASSISTANT,),
    router=router,
    hub_provider=lms_hub_provider,
)
```

The hub provider must return JSON-serializable data. Do not return database client objects, Pydantic classes without converting them, or functions.

Recommended backend ownership:

- `schemas.py`: Pydantic request/response models only.
- `service.py`: business logic, Supabase reads/writes, static JSON parsing.
- `router.py`: FastAPI routes, validation, RBAC dependencies.
- `module.py`: `CampusModule` metadata and optional hub provider.
- `tools.py`: optional LangChain tools exported through `CampusModule(agent_tools=...)`.
- `default_<module>.json`: optional MVP seed/mock data.

## Backend Router Pattern

Use this route prefix:

```python
router = APIRouter(prefix="/api/modules/lms", tags=["lms"])
```

Protect endpoints with RBAC:

```python
@router.get("/assignments")
def get_assignments(
    role: Role = Depends(require_permission("lms:view")),
):
    ...
```

Add new permissions in `backend/core/rbac.py`. Keep names predictable:

- `<module_key>:view`
- `<module_key>:manage`
- `<module_key>:review`
- `<module_key>:approve`
- `<module_key>:grade`

For hackathon MVP, role is passed through the `X-User-Role` header. Do not build module-specific login/auth yet. Later, real auth should resolve user roles centrally and keep the same permission names.

Designations are passed through `X-User-Designations` as a comma-separated header during the MVP:

```text
X-User-Role: student
X-User-Designations: food_committee,teaching_assistant
```

Use designations for additional responsibilities rather than inventing a global role for each duty:

- Food Committee: student designation.
- Teaching Assistant: student designation.
- Warden: professor designation.
- Security: staff designation.
- Classroom Support: staff designation.

Do not add a global role unless it describes the person's base identity across the campus, such as `student`, `professor`, `staff`, or `admin`.

## Database Pattern

For any persisted module data, prefer campus-scoped tables:

```sql
CREATE TABLE IF NOT EXISTS <module_table> (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    ...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Use composite unique constraints for rows that should be idempotently upserted:

```sql
UNIQUE(campus_id, date, item_key)
```

Do not key shared campus data by `user_id` unless the data is truly user-specific. Menus, events, exam schedules, and notices are usually campus-level. Reviews, submissions, leave requests, and personal preferences are user-level.

For now, schema changes go in `backend/schema.sql`. Keep table names module-prefixed when there is a chance of collision, such as `lms_assignments`, `exam_lms_slots`, or `campus_leave_applications`.

Use shared campus-level tables only when the data will be reused by multiple modules. Current example: `campus_courses` and `campus_course_sessions` are intentionally shared because Room Tracker, ERP, LMS, Exam Portal, and Announcements all need stable course IDs.

## Frontend Module Contract

Every frontend module must expose `manifest.ts`.

```ts
import type { FrontendModuleManifest } from '../../types/campus'
import LmsGlance from './LmsGlance'
import LmsPage from './LmsPage'

export const manifest: FrontendModuleManifest = {
  key: 'lms',
  name: 'LMS',
  summary: 'Courses, assignments, materials, and TA workflows.',
  status: 'connected',
  roles: ['student', 'professor', 'admin'],
  designations: ['teaching_assistant'],
  Page: LmsPage,
  Widget: LmsGlance,
}

export default manifest
```

The widget must accept `ModuleWidgetProps`:

```tsx
import type { ModuleWidgetProps } from '../../types/campus'

function LmsGlance({ campusId, designations, openModule, overview, role, userId }: ModuleWidgetProps) {
  return <section>...</section>
}

export default LmsGlance
```

`Widget` is the dashboard glance only. It should show the minimum useful summary and an action that calls `openModule?.('<module_key>')`.

`Page` is the full module experience opened from the left navigation or from the dashboard glance. Put tabs, forms, uploads, detailed tables, and module-specific workflows in `Page`, not in `Widget`.

The hub discovers manifests through `frontend/src/modules/registry.ts`. Do not import a new module directly inside `HubDashboard.tsx`.

Recommended frontend ownership:

- `manifest.ts`: module metadata and widget registration.
- `<ModuleGlance>.tsx`: dashboard-level module summary.
- `<ModuleGlance>.css`: module-local glance styles using design tokens.
- `<ModulePage>.tsx`: full module workflow.
- `<ModulePage>.css`: module-local page styles using design tokens.
- `api.ts`: optional module-local frontend API calls.
- `types.ts`: optional module-local types that should not be global.

Only promote types into `frontend/src/types/campus.ts` when multiple modules or the hub need them.

## Shared Frontend Types

Shared contracts live in `frontend/src/types/campus.ts`.

Use shared types for cross-module data:

- `Role`
- `HubOverview`
- `ModuleSummary`
- `HubNotification`
- `HubUpdate`
- `CalendarItem`
- `ModuleWidgetProps`
- `FrontendModuleManifest`

Only create module-local types when the data belongs only to that module.

## Hub Data Contract

The hub endpoint is:

```text
GET /api/hub/overview
```

It returns:

```ts
type HubOverview = {
  campus_id: string
  user_id: string
  role: Role
  date: string
  notifications: HubNotification[]
  updates: HubUpdate[]
  calendar: CalendarItem[]
  modules: ModuleSummary[]
  menu?: MenuDay
  module_data?: Record<string, unknown>
}
```

For new modules, prefer putting detailed module-specific data under `module_data[module_key]`. Keep top-level fields only for established core modules.

Example module contribution:

```python
def lms_hub_provider(campus_id, user_id, role, today, designations):
    return {
        "notifications": [],
        "updates": [],
        "calendar": [],
        "module_data": {
            "lms": {
                "pending_assignments": [],
                "next_class": None,
            }
        }
    }
```

The hub service merges module-specific `notifications`, `updates`, `calendar`, and `module_data`. Keep these contributions short. Full workflows still belong in module pages.

## Assistant Integration

The assistant is intentionally modular:

- `backend/ai/agent.py` discovers tools from module manifests.
- Module services fetch data and tools format bounded responses.
- LangChain only formats the module data.
- If `GROQ_API_KEY` is missing, deterministic fallback responses are used.

When adding assistant support for a module:

1. Add a narrow tool in `backend/modules/<module_key>/tools.py`.
2. Export a list such as `LMS_TOOLS`.
3. Attach that list to `CampusModule(agent_tools=...)` in `module.py`.
4. Keep the prompt grounded in raw module data.
5. Do not let the chain directly query Supabase tables.

## Design Rules

Use the screenshot-derived theme variables from `frontend/src/design/theme.css`:

- `--cb-orange`
- `--cb-orange-strong`
- `--cb-cyan`
- `--cb-blue`
- `--cb-ink`
- `--cb-paper`
- `--cb-white`
- `--cb-callout`
- `--cb-border`
- `--cb-muted`

Do not introduce a new palette for individual modules. A module can vary layout, density, and controls, but it should still feel like part of campuz.

## Testing A Module

Backend:

```bash
cd backend
python3 -m compileall ai core modules main.py database.py seed_db.py test_sync.py
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

If `npm install` fails because of a network or registry policy, do not commit partial `node_modules`. Delete it and report the registry error.

Project-local npm config lives in `frontend/.npmrc` so this repo can use public npm without changing global proxy settings. If a company proxy is active, run npm commands with proxy environment variables cleared for this project only.

## Branch And Commit Workflow

For parallel development:

1. Create a branch named `<Name>-<module-key>` or `<Name>-<short-task>`.
2. Keep changes scoped to the module folders whenever possible.
3. Run backend and frontend checks.
4. Commit source/config/docs only.
5. Push the branch and open a PR.

Do not commit:

- `.env`
- `backend/venv/`
- `frontend/node_modules/`
- `frontend/dist/`
- Python `__pycache__/`

## Merge Conflict Rules

Avoid editing these files unless your task explicitly requires shared architecture changes:

- `backend/main.py`
- `backend/modules/hub/service.py`
- `frontend/src/App.tsx`
- `frontend/src/modules/hub/HubDashboard.tsx`
- `frontend/src/modules/registry.ts`
- `frontend/src/types/campus.ts`

Normal module work should happen inside:

- `backend/modules/<module_key>/`
- `frontend/src/modules/<module_key>/`

RBAC changes are the main exception. If your module needs new permissions, edit `backend/core/rbac.py` with the smallest possible change.

Shared frontend type changes are another exception. If your module needs a cross-module contract, edit `frontend/src/types/campus.ts`, but do not put module-only details there.

Hub-owned surface changes are a separate exception. Use `frontend/src/modules/hub/` and `docs/hub_surfaces.md` for dashboard, personal calendar, and standalone assistant work.

## Module Checklist

Before handing off a module:

1. Backend module has `module.py`, `router.py`, `schemas.py`, and `service.py`.
2. Frontend module has `manifest.ts` and at least one typed widget.
3. Routes use `/api/modules/<module_key>`.
4. Protected backend routes use `require_permission`.
5. Frontend uses `ModuleWidgetProps`.
6. CSS uses `theme.css` variables.
7. `python3 -m compileall ai core modules main.py database.py seed_db.py test_sync.py` passes from `backend/`.
8. `npm run typecheck` passes when dependencies are installed.
9. No module-specific code was added to another module folder.
10. The module can be disabled or ignored without breaking the hub.

## Academic Module Notes

Use `docs/academic_modules.md` for the current ERP, LMS, Exam Portal, Announcements, and shared timetable catalog contract.

Key rule: reuse `course_id` from `backend/modules/academics/default_courses.json` and `frontend/src/modules/academics/defaultCourses.json`. Do not create module-local course identifiers for assignments, quizzes, announcements, or registrations.

Use `docs/hub_surfaces.md` for Hub-owned Personal Calendar and AI Chat behavior.
