# CampusBuddy Module Development Guide

This guide is for agents and teammates building modules from separate devices. Follow it closely to keep modules pluggable and avoid merge conflicts.

## Why TypeScript Now

The frontend is now TypeScript-first because this project will have many independently developed modules. TypeScript helps catch integration mistakes before runtime:

- A module cannot silently return the wrong hub payload shape.
- Role strings are checked against the shared `Role` union.
- Widget props are shared through `ModuleWidgetProps`.
- API responses such as `HubOverview`, `MenuDay`, and `CalendarItem` are documented in code.
- Future app packaging as a PWA or native shell is easier when contracts are explicit.

Keep the TypeScript simple. Type shared data contracts strongly, let local UI state infer where possible, and avoid building elaborate generic abstractions before the module flow is proven.

## Why The Module Refactor Helps

The repo is designed for parallel module development. Menu, LMS, ERP, Exam LMS, Campus Leave, and future apps should be built in their own folders.

The refactor helps because:

- Backend routers are discovered from `backend/modules/<module_key>/module.py`.
- Frontend widgets are discovered from `frontend/src/modules/<module_key>/manifest.ts`.
- The hub aggregates module summaries and data instead of owning module internals.
- Shared RBAC stays centralized while module workflows stay isolated.
- Future module work should rarely touch `backend/main.py`, `frontend/src/App.tsx`, or the hub shell.

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
      fetcher.py
      module.py
      router.py
      schemas.py
      service.py
  database.py
  main.py
  requirements.txt
  schema.sql

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
    menu/
      manifest.ts
      MenuWidget.css
      MenuWidget.tsx
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
  default_lms.json        # optional static MVP data

frontend/src/modules/lms/
  manifest.ts
  LmsWidget.tsx
  LmsWidget.css
  api.ts                 # optional module-local frontend API helper
  types.ts               # optional module-local types
```

Use lowercase snake case for module folders and keys:

- `menu`
- `lms`
- `erp`
- `exam_lms`
- `campus_leave`

Use PascalCase for React components:

- `MenuWidget`
- `LmsWidget`
- `ExamLmsWidget`

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
    roles=(Role.STUDENT, Role.PROFESSOR, Role.TEACHING_ASSISTANT, Role.ADMIN),
    router=router,
)
```

If the module contributes dashboard data, add a hub provider:

```python
def lms_hub_provider(campus_id, user_id, role, today):
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
    roles=(Role.STUDENT, Role.PROFESSOR, Role.TEACHING_ASSISTANT, Role.ADMIN),
    router=router,
    hub_provider=lms_hub_provider,
)
```

The hub provider must return JSON-serializable data. Do not return database client objects, Pydantic classes without converting them, or functions.

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

## Frontend Module Contract

Every frontend module must expose `manifest.ts`.

```ts
import type { FrontendModuleManifest } from '../../types/campus'
import LmsWidget from './LmsWidget'

export const manifest: FrontendModuleManifest = {
  key: 'lms',
  name: 'LMS',
  summary: 'Courses, assignments, materials, and TA workflows.',
  status: 'connected',
  roles: ['student', 'professor', 'teaching_assistant', 'admin'],
  Widget: LmsWidget,
}

export default manifest
```

The widget must accept `ModuleWidgetProps`:

```tsx
import type { ModuleWidgetProps } from '../../types/campus'

function LmsWidget({ campusId, overview, role, userId }: ModuleWidgetProps) {
  return <section>...</section>
}

export default LmsWidget
```

The hub discovers manifests through `frontend/src/modules/registry.ts`. Do not import a new module directly inside `HubDashboard.tsx`.

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

Do not introduce a new palette for individual modules. A module can vary layout, density, and controls, but it should still feel like part of CampusBuddy.

## Testing A Module

Backend:

```bash
cd backend
python3 -m compileall .
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

## Module Checklist

Before handing off a module:

1. Backend module has `module.py`, `router.py`, `schemas.py`, and `service.py`.
2. Frontend module has `manifest.ts` and at least one typed widget.
3. Routes use `/api/modules/<module_key>`.
4. Protected backend routes use `require_permission`.
5. Frontend uses `ModuleWidgetProps`.
6. CSS uses `theme.css` variables.
7. `python3 -m compileall backend` passes.
8. `npm run typecheck` passes when dependencies are installed.
9. No module-specific code was added to another module folder.
