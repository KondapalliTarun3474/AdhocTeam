# Academic Modules: LMS, ERP, Exam Portal, Announcements

This is the handoff guide for the small academic module set built from `TI-2026-27 Elective Courses Timetable-v1.xlsx`.

## Shared Course Catalog

The timetable data is normalized once and reused everywhere.

```text
backend/modules/academics/
  __init__.py
  default_courses.json
  schemas.py
  service.py

frontend/src/modules/academics/
  catalog.ts
  defaultCourses.json
  types.ts
```

Use `course_id` as the stable key across ERP, LMS, Exam Portal, Room Tracker, and future course-aware modules. Do not create a second course identifier in another module.

Every timetable session is 90 minutes. The generated catalog stores course code, course name, department, professors, room, raw timing text, and normalized sessions with day, start time, end time, room, and tutorial flags.

Duplicate course codes are disambiguated in `course_id` by combining code and title, so MTech and iMTech variants of the same code do not overwrite each other.

## ERP

Backend:

```text
backend/modules/erp/
  __init__.py
  module.py
  router.py
  schemas.py
  service.py
  tools.py
```

Frontend:

```text
frontend/src/modules/erp/
  Erp.css
  ErpGlance.tsx
  ErpPage.tsx
  api.ts
  manifest.ts
  types.ts
```

Endpoints:

- `GET /api/modules/erp/workspace`
- `POST /api/modules/erp/registrations`
- `DELETE /api/modules/erp/registrations/{course_id}`

Rules:

- Students can register and drop courses.
- Registration is blocked when any normalized session overlaps with an already registered course.
- `personal_calendar` is returned from the ERP workspace and also published into hub `module_data.personal_calendar`.
- The Hub uses this same calendar so the assistant and dashboard can reason over classes and breaks.

## LMS

Backend:

```text
backend/modules/lms/
  __init__.py
  module.py
  router.py
  schemas.py
  service.py
  tools.py
```

Frontend:

```text
frontend/src/modules/lms/
  Lms.css
  LmsGlance.tsx
  LmsPage.tsx
  api.ts
  manifest.ts
  types.ts
```

Endpoints:

- `GET /api/modules/lms/workspace`
- `POST /api/modules/lms/submissions`

Rules:

- MVP scope is assignments, deadlines, and PDF submission only.
- Submissions must be PDF files.
- Professors/admins/TAs have management permission, but assignment creation UI is intentionally deferred until module detail specs are provided.
- Hub shows the next deadline as a summary only.

## Exam Portal

Backend:

```text
backend/modules/exam_lms/
  __init__.py
  module.py
  router.py
  schemas.py
  service.py
  tools.py
```

Frontend:

```text
frontend/src/modules/exam_lms/
  Exam.css
  ExamGlance.tsx
  ExamPage.tsx
  api.ts
  manifest.ts
  types.ts
```

Endpoint:

- `GET /api/modules/exam-lms/workspace`

Rules:

- MVP scope is quiz schedule, start/end windows, room, and released score display.
- Scores can be pending or released.
- TAs can view the portal; professors/admins have management permission.

## Announcements

Backend:

```text
backend/modules/announcements/
  __init__.py
  module.py
  router.py
  schemas.py
  service.py
  tools.py
```

Frontend:

```text
frontend/src/modules/announcements/
  Announcements.css
  AnnouncementsGlance.tsx
  AnnouncementsPage.tsx
  api.ts
  manifest.ts
  types.ts
```

Endpoints:

- `GET /api/modules/announcements/workspace`
- `POST /api/modules/announcements`

Rules:

- Students, professors, staff, and admins can view announcements.
- Professors, admins, and students with the `teaching_assistant` designation can create announcements.
- Announcements support `category`, `tag`, optional `course_id`, `audience`, and `priority`.
- Supported MVP categories include Courses, Hackathons, Volunteering, Events, Placements, and Resources.

## RBAC

Permissions are centralized in `backend/core/rbac.py`.

Current academic permissions:

- `lms:view`
- `lms:submit`
- `lms:manage`
- `erp:view`
- `erp:register`
- `erp:manage`
- `exam_lms:view`
- `exam_lms:manage`
- `announcements:view`
- `announcements:create`
- `announcements:campus:create`
- `announcements:moderate`

Do not add module-specific global roles. Use base roles plus designations:

- Student
- Professor
- Staff
- Admin
- Teaching Assistant as a student designation

## Hub Contract

Academic modules publish short summaries only:

- ERP publishes `module_data.personal_calendar` and registered course count.
- LMS publishes assignment count and next assignment.
- Exam Portal publishes quiz count and next quiz.
- Announcements publishes latest notice and unread count.

Full tables, registration controls, upload forms, and announcement creation belong in the module pages.

## Assistant Tools

Each module exposes a `tools.py` list consumed by `backend/core/module_registry.py`.

Current tools:

- `get_personal_academic_calendar`
- `get_lms_assignments`
- `get_exam_portal_quizzes`
- `get_campus_announcements`

The assistant prompt in `backend/ai/agent.py` tells LangChain to prefer these tools for schedule, free-time, assignment, quiz, score, and announcement questions. Keep new assistant capabilities module-local first, then expose them through `module.py`.

## Database Tables

Schema entries live in `backend/schema.sql`.

Academic tables:

- `campus_courses`
- `campus_course_sessions`
- `erp_course_registrations`
- `lms_assignments`
- `lms_assignment_submissions`
- `exam_quizzes`
- `exam_quiz_scores`
- `campus_announcements`

Keep course/session tables shared. Keep module-specific actions in module-prefixed tables.

## Local Verification

Backend:

```bash
cd backend
python3 -m compileall ai core modules main.py database.py seed_db.py test_sync.py
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
npm run dev
```
