# Campus Room Tracker And Leave Application Notes

This document is for teammates and agents extending the campus.iiitb.net-style modules. Keep future work for these modules inside their module folders unless a shared contract must change.

## Module Folders

```text
backend/modules/campus_rooms/
  __init__.py
  module.py
  router.py
  schemas.py
  service.py

frontend/src/modules/campus_rooms/
  api.ts
  CampusRooms.css
  CampusRoomsGlance.tsx
  CampusRoomsPage.tsx
  defaultRooms.ts
  manifest.ts
  types.ts
```

```text
backend/modules/campus_leave/
  __init__.py
  module.py
  router.py
  schemas.py
  service.py

frontend/src/modules/campus_leave/
  api.ts
  CampusLeave.css
  CampusLeaveGlance.tsx
  CampusLeavePage.tsx
  defaultLeave.ts
  manifest.ts
  types.ts
```

Shared files touched by these modules:

```text
backend/core/rbac.py
backend/modules/hub/service.py
backend/schema.sql
frontend/src/api/client.ts
frontend/src/App.tsx
frontend/src/types/campus.ts
```

Do not place campus room or leave UI inside the hub. The hub should show only glances and calendar/notification summaries.

## Access Model

Global roles:

- `student`
- `professor`
- `staff`
- `admin`

Designations:

- `warden`: professor designation.
- `security`: staff designation.
- `classroom_support`: staff designation.

Effective permissions are:

```text
global role permissions + designation permissions
```

MVP headers:

```text
X-User-Role: professor
X-User-Designations: warden
```

```text
X-User-Role: staff
X-User-Designations: security
```

```text
X-User-Role: staff
X-User-Designations: classroom_support
```

## Campus Room Tracker

Module key:

```text
campus_rooms
```

Default external website:

```text
https://campus.iiitb.net
```

Default app tabs:

- Calendar
- Rooms
- Courses
- Classroom Support
- Setup

The calendar mirrors the campus portal reference:

- View by All, Faculty, Course, or Room.
- Week and Day modes.
- Previous, Today, and Next controls.
- Room/class/event/block entries shown by date and time.

Classroom Support can:

- Book a room.
- Block a room.
- Cancel a booking locally through the support queue.

Students, professors, security, wardens, and admins can view the calendar.

## Shared Course Contract

Courses are intentionally not embedded only inside room bookings. Use stable course IDs because LMS and Exam LMS will need the same records later.

Backend schema:

```text
campus_courses
```

Frontend type:

```text
CampusCourse
```

Core fields:

```text
campus_id
course_id
course_code
course_name
term
professor_id
professor_name
department
```

Room bookings may reference `course_id`, `course_code`, and `course_name`. Future LMS and Exam LMS modules should reuse `course_id` rather than creating a new course identifier.

## Campus Room Endpoints

```text
GET   /api/modules/campus-rooms/workspace
GET   /api/modules/campus-rooms/config
PUT   /api/modules/campus-rooms/config
GET   /api/modules/campus-rooms/rooms
GET   /api/modules/campus-rooms/courses
GET   /api/modules/campus-rooms/bookings
POST  /api/modules/campus-rooms/bookings
PATCH /api/modules/campus-rooms/bookings/{booking_id}
```

The main frontend read endpoint is:

```text
GET /api/modules/campus-rooms/workspace
```

It returns config, rooms, shared courses, bookings, and the next booking.

## Leave Application

Module key:

```text
campus_leave
```

Default external website:

```text
https://campus.iiitb.net
```

Default app tabs:

- Apply
- Applications
- Profile
- Curfew
- Security
- Warden
- Setup

Students can:

- Request leave.
- See their leave history.
- See their curfew violation count.
- See profile, room, parent, guardian, email, and phone details.

Security can:

- See all leave applications.
- Mark leave records as checked out or checked in.
- Update curfew violation counts.
- See the student room directory.

Wardens can:

- See pending leave applications.
- Approve or reject leave applications.
- See all students and room numbers.

Admins can configure the module source and use all module controls.

## Leave Endpoints

```text
GET   /api/modules/campus-leave/workspace
GET   /api/modules/campus-leave/config
PUT   /api/modules/campus-leave/config
GET   /api/modules/campus-leave/applications
POST  /api/modules/campus-leave/applications
PATCH /api/modules/campus-leave/applications/{application_id}
GET   /api/modules/campus-leave/students
PATCH /api/modules/campus-leave/curfew
```

The main frontend read endpoint is:

```text
GET /api/modules/campus-leave/workspace
```

It returns config, the current student profile, that student's applications, and role/designation-dependent staff data.

## Persistence

Supabase tables added in `backend/schema.sql`:

```text
campus_courses
campus_rooms
campus_room_bookings
campus_student_profiles
campus_leave_applications
```

When Supabase is not configured, both modules return preview-mode in-memory data so the hackathon demo remains usable locally.

## Hub Integration

`CampusRoomsGlance.tsx` shows the next booking and opens the full Room Tracker.

`CampusLeaveGlance.tsx` shows the latest leave application for students, or the pending queue for staff/designated users.

Backend module providers add:

- Room calendar items under `calendar`.
- Room summary under `module_data.campus_rooms`.
- Leave notifications and summary under `module_data.campus_leave`.

Keep hub widgets summary-only. Forms, calendars, tables, approvals, and support workflows belong in module pages.

## Verification

Run these checks after edits:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

```bash
cd backend
python3 -m compileall ai core modules main.py database.py test_agent.py test_sync.py
```

Optional smoke checks should cover:

- Student can read room workspace.
- Classroom Support can create a booking/block.
- Student can read leave workspace and submit leave.
- Security can list all leave applications.
- Warden can list student rooms.
