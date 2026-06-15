# CampusBuddy: Modular Hub Architecture

## 1. Product Direction

CampusBuddy is the central hub for student life. The first screen is a dashboard with:

- Notifications
- New updates
- Calendar
- Connected module widgets
- Assistant chat

The personal calendar and standalone AI chat are Hub-owned surfaces, not separate modules. The Hub dashboard shows glance versions; full-screen/full-page versions live under the Hub route layer.

Individual campus apps are developed as independent modules: Foode/Menu, Campus Room Tracker, Leave Application, LMS, ERP, Exam LMS, and future apps. Each module owns its backend routes, schemas, services, and frontend UI.

The hub is a glance surface. It should show summaries only, such as the next meal from Foode. Full module workflows open as separate pages from the left navigation or from a glance action button.

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
      default_weekly_menu.json
      default_menu.json
      fetcher.py
      module.py
      router.py
      schemas.py
      service.py
    campus_rooms/
      module.py
      router.py
      schemas.py
      service.py
    campus_leave/
      module.py
      router.py
      schemas.py
      service.py
    academics/
      default_courses.json
      schemas.py
      service.py
    erp/
      module.py
      router.py
      schemas.py
      service.py
      tools.py
    lms/
      module.py
      router.py
      schemas.py
      service.py
      tools.py
    exam_lms/
      module.py
      router.py
      schemas.py
      service.py
      tools.py
    announcements/
      module.py
      router.py
      schemas.py
      service.py
      tools.py
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
      MenuGlance.tsx
      MenuGlance.css
      MenuWidget.tsx
      MenuWidget.css
      api.ts
      defaultMenu.ts
      types.ts
    campus_rooms/
      CampusRoomsGlance.tsx
      CampusRoomsPage.tsx
      CampusRooms.css
      api.ts
      defaultRooms.ts
      manifest.ts
      types.ts
    campus_leave/
      CampusLeaveGlance.tsx
      CampusLeavePage.tsx
      CampusLeave.css
      api.ts
      defaultLeave.ts
      manifest.ts
      types.ts
    academics/
      catalog.ts
      defaultCourses.json
      types.ts
    erp/
      ErpGlance.tsx
      ErpPage.tsx
      Erp.css
      api.ts
      manifest.ts
      types.ts
    lms/
      LmsGlance.tsx
      LmsPage.tsx
      Lms.css
      api.ts
      manifest.ts
      types.ts
    exam_lms/
      ExamGlance.tsx
      ExamPage.tsx
      Exam.css
      api.ts
      manifest.ts
      types.ts
    announcements/
      AnnouncementsGlance.tsx
      AnnouncementsPage.tsx
      Announcements.css
      api.ts
      manifest.ts
      types.ts
    assistant/
      AssistantPanel.tsx
      AssistantPanel.css
```

Rule: a module should not edit another module's folder. Shared contracts belong in `backend/core`, `backend/modules/academics`, `frontend/src/api`, `frontend/src/types`, `frontend/src/modules/academics`, or `frontend/src/design`.

Frontend code is TypeScript-first. Shared API and hub contracts live in `frontend/src/types/campus.ts`. Module UI should use `.tsx`, module APIs should use `.ts`, and each module should export a typed `manifest.ts`.

Hub-owned surfaces should not export manifests. Current Hub surfaces are documented in `docs/hub_surfaces.md`.

## 4. RBAC Model

RBAC is centralized in `backend/core/rbac.py`.

Current global roles:

- `student`
- `professor`
- `staff`
- `admin`

Current designations:

- `food_committee`
- `teaching_assistant`
- `warden`
- `security`
- `classroom_support`

Food Committee and TA are student designations, Warden is a professor designation, and Security/Classroom Support are staff designations. A user's effective permissions are:

```text
global role permissions + designation permissions
```

Current Menu permissions:

- Students: view menu, rate menu items, request sick meals, send feedback
- Food Committee designation: manage weekly menus, import Excel sheets, view ratings, view sick meals, view feedback
- Admin: configure module source, assign roles/designations, manage menu, view all module controls

The backend currently uses `X-User-Role` and `X-User-Designations` as simple hackathon headers. Real auth can replace these later without forcing modules to rewrite their permission checks.

Header examples:

```text
X-User-Role: student
X-User-Designations: food_committee
```

```text
X-User-Role: staff
X-User-Designations: security
```

```text
X-User-Role: admin
X-User-Designations:
```

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
- `GET /api/modules/menu/workspace`
- `GET /api/modules/menu/config`
- `PUT /api/modules/menu/config`
- `GET /api/modules/menu/week`
- `PUT /api/modules/menu/week`
- `POST /api/modules/menu/import`
- `POST /api/modules/menu/sync`
- `PUT /api/modules/menu`
- `POST /api/modules/menu/ratings`
- `POST /api/modules/menu/sick-meals`
- `POST /api/modules/menu/feedback`
- `POST /api/modules/menu/reviews`

Menu module setup supports:

- `external_website`: campus admins add an existing URL such as `foodcommittee.iiitb.ac.in`.
- `default_app`: campus admins use the built-in CampusBuddy Menu app.

The default app includes weekly menu display, per-item ratings, sick meal requests, feedback, Food Committee manual menu edits, and raw `.xlsx` menu import.

Campus Room Tracker endpoints:

- `GET /api/modules/campus-rooms/workspace`
- `GET /api/modules/campus-rooms/config`
- `PUT /api/modules/campus-rooms/config`
- `GET /api/modules/campus-rooms/rooms`
- `GET /api/modules/campus-rooms/courses`
- `GET /api/modules/campus-rooms/bookings`
- `POST /api/modules/campus-rooms/bookings`
- `PATCH /api/modules/campus-rooms/bookings/{booking_id}`

Leave Application endpoints:

- `GET /api/modules/campus-leave/workspace`
- `GET /api/modules/campus-leave/config`
- `PUT /api/modules/campus-leave/config`
- `GET /api/modules/campus-leave/applications`
- `POST /api/modules/campus-leave/applications`
- `PATCH /api/modules/campus-leave/applications/{application_id}`
- `GET /api/modules/campus-leave/students`
- `PATCH /api/modules/campus-leave/curfew`

Both campus modules support `external_website` with `https://campus.iiitb.net` and `default_app` with the built-in CampusBuddy experience.

Academic module endpoints:

- `GET /api/modules/erp/workspace`
- `POST /api/modules/erp/registrations`
- `DELETE /api/modules/erp/registrations/{course_id}`
- `GET /api/modules/lms/workspace`
- `POST /api/modules/lms/submissions`
- `GET /api/modules/exam-lms/workspace`
- `GET /api/modules/announcements/workspace`
- `POST /api/modules/announcements`

The shared timetable catalog lives in `backend/modules/academics/default_courses.json` and `frontend/src/modules/academics/defaultCourses.json`. ERP, LMS, Exam Portal, Room Tracker, Announcements, and future course-aware modules should reuse `course_id`.

## 6. Hub Integration Pattern

The hub aggregates summaries, not full module logic.

Each backend module exposes `module.py`. The backend discovers these files through `backend/core/module_registry.py`, so new module routers do not require direct imports in `backend/main.py`.

Each frontend module exposes `manifest.ts`. The frontend discovers manifests through `frontend/src/modules/registry.ts`, so the hub can render connected widgets without importing every module by hand.

Frontend manifests may expose:

- `Widget`: dashboard glance.
- `Page`: full module page.

Keep forms, uploads, detailed tables, and module-specific tabs in `Page`. Keep `Widget` small.

The current hub endpoint is:

- `GET /api/hub/overview`

It returns:

- `notifications`
- `updates`
- `calendar`
- `modules`
- `menu`
- `module_data` for detailed non-core module payloads

Future modules can add their own notifications and calendar events without changing the frontend shell structure. Current connected examples are Campus Room Tracker calendar rows, Leave Application queue notifications, ERP personal calendar rows, LMS assignment notices, Exam Portal quiz notices, and Announcements inbox notices.

The full student calendar is a Hub page that consumes ERP, LMS, and Exam Portal data. It does not own registration, assignment submission, or quiz workflows.

## 7. Assistant Chain

The assistant lives in `backend/ai/agent.py`.

Current rule:

- Module services fetch plain data.
- LangChain formats that data.
- The chain should not directly query database tables.

This keeps the assistant stable while modules are developed separately.

Current module tools:

- Menu questions use menu tools.
- Room booking questions use room tools.
- Leave questions use leave tools.
- Schedule and free-time questions use ERP's `get_personal_academic_calendar`.
- Assignment questions use LMS's `get_lms_assignments`.
- Quiz and score questions use Exam Portal's `get_exam_portal_quizzes`.
- Notice, inbox, opportunity, and event questions use Announcements' `get_campus_announcements`.
- If `GROQ_API_KEY` or `langchain-groq` is missing, the assistant returns deterministic fallback output.

## 8. Adding a New Module

To add another campus app:

1. Create `backend/modules/<module_key>/`.
2. Add `schemas.py`, `service.py`, `router.py`, and `module.py`.
3. Add permissions in `backend/core/rbac.py`.
4. Create `frontend/src/modules/<module_key>/`.
5. Add `<ModuleGlance>.tsx`, `<ModulePage>.tsx`, their CSS files, and `manifest.ts`.
6. Use shared frontend types from `frontend/src/types/campus.ts`.
7. Keep module-specific UI and CSS inside the module folder.

This keeps development parallel-friendly and reduces merge conflicts.

For detailed implementation rules, use `docs/module_development_guide.md` as the source of truth.

For Menu-specific setup, Excel import, ratings, sick meals, and feedback behavior, use `docs/menu_module_implementation.md`.

For Campus Room Tracker and Leave Application behavior, use `docs/campus_rooms_leave_modules.md`.

For ERP, LMS, Exam Portal, Announcements, and shared course catalog behavior, use `docs/academic_modules.md`.

For Hub Calendar and standalone Assistant behavior, use `docs/hub_surfaces.md`.

Food Committee CSV upload template:

```text
docs/templates/foodcommittee_menu_upload_template.csv
```
