# CampusBuddy: Modular Hub Architecture

## 1. Product Direction

CampusBuddy is the central hub for student life. The first screen is a dashboard with:

- Notifications
- New updates
- Calendar
- Connected module widgets
- Assistant chat

Individual campus apps are developed as independent modules: Menu, LMS, ERP, Exam LMS, Campus Leave, and future apps. Each module owns its backend routes, schemas, services, and frontend UI.

## 2. Design System

The frontend uses colors extracted from the provided hackathon screenshot:

- Orange: `#E64E09`
- Strong orange: `#EC480D`
- Cyan: `#0AB0D6`
- Blue: `#306FB8`
- Ink: `#252F3B`
- Paper: `#F7FAFB`
- White: `#FFFFFF`
- Callout blue: `#C1E9FF`

These values live in `frontend/src/design/theme.css`. New modules should use those CSS variables instead of introducing unrelated palettes.

## 3. Folder Contract

Backend modules live under `backend/modules/<module_key>/`.
Frontend modules live under `frontend/src/modules/<module_key>/`.

```text
backend/
  core/
    rbac.py
    router.py
  modules/
    hub/
      router.py
      service.py
    menu/
      default_menu.json
      fetcher.py
      module.py
      router.py
      schemas.py
      service.py
  ai/
    agent.py
  main.py

frontend/src/
  api/
    client.ts
  design/
    theme.css
  types/
    campus.ts
  modules/
    registry.ts
    hub/
      HubDashboard.tsx
      HubDashboard.css
    menu/
      manifest.ts
      MenuWidget.tsx
      MenuWidget.css
    assistant/
      AssistantPanel.tsx
      AssistantPanel.css
```

Rule: a module should not edit another module's folder. Shared contracts belong in `backend/core`, `frontend/src/api`, `frontend/src/types`, or `frontend/src/design`.

Frontend code is TypeScript-first. Shared API and hub contracts live in `frontend/src/types/campus.ts`. Module UI should use `.tsx`, module APIs should use `.ts`, and each module should export a typed `manifest.ts`.

## 4. RBAC Model

RBAC is centralized in `backend/core/rbac.py`.

Current roles:

- `student`
- `food_committee`
- `professor`
- `teaching_assistant`
- `admin`

Current Menu permissions:

- Students: view menu, review dishes
- Food committee: view menu, manage menu
- Admin: assign roles, manage menu, view all module controls

The backend currently uses `X-User-Role` as a simple hackathon header. Real auth can replace this later without forcing modules to rewrite their permission checks.

## 5. Module API Pattern

Each module should expose an APIRouter and a module manifest:

```python
router = APIRouter(prefix="/api/modules/<module_key>", tags=["<module_key>"])
```

```python
MODULE = CampusModule(
    key="<module_key>",
    name="<Human Name>",
    status="connected",
    summary="Short dashboard summary.",
    roles=(Role.STUDENT, Role.ADMIN),
    router=router,
    hub_provider=optional_hub_provider,
)
```

Each protected endpoint should use:

```python
Depends(require_permission("<module_key>:<action>"))
```

Example paths for Menu:

- `GET /api/modules/menu`
- `GET /api/modules/menu/today`
- `POST /api/modules/menu/sync`
- `PUT /api/modules/menu`
- `POST /api/modules/menu/reviews`

## 6. Hub Integration Pattern

The hub aggregates summaries, not full module logic.

Each backend module exposes `module.py`. The backend discovers these files through `backend/core/module_registry.py`, so new module routers do not require direct imports in `backend/main.py`.

Each frontend module exposes `manifest.ts`. The frontend discovers manifests through `frontend/src/modules/registry.ts`, so the hub can render connected widgets without importing every module by hand.

The current hub endpoint is:

- `GET /api/hub/overview`

It returns:

- `notifications`
- `updates`
- `calendar`
- `modules`
- `menu`
- `module_data` for detailed non-core module payloads

Future modules can add their own notifications and calendar events without changing the frontend shell structure.

## 7. Assistant Chain

The assistant lives in `backend/ai/agent.py`.

Current rule:

- Module services fetch plain data.
- LangChain formats that data.
- The chain should not directly query database tables.

This keeps the assistant stable while modules are developed separately.

Current basic task:

- Menu questions route to `modules.menu.service.format_menu_for_assistant`.
- If `GROQ_API_KEY` or `langchain-groq` is missing, the assistant returns deterministic fallback output.

## 8. Adding a New Module

To add LMS, ERP, Exam LMS, Campus Leave, or another app:

1. Create `backend/modules/<module_key>/`.
2. Add `schemas.py`, `service.py`, `router.py`, and `module.py`.
3. Add permissions in `backend/core/rbac.py`.
4. Create `frontend/src/modules/<module_key>/`.
5. Add `<ModuleWidget>.tsx`, `<ModuleWidget>.css`, and `manifest.ts`.
6. Use shared frontend types from `frontend/src/types/campus.ts`.
7. Keep module-specific UI and CSS inside the module folder.

This keeps development parallel-friendly and reduces merge conflicts.

For detailed implementation rules, use `docs/module_development_guide.md` as the source of truth.
