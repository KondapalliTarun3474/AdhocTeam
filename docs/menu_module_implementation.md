# Menu Module Implementation Notes

This document is for teammates and agents working on the Menu module from other devices. Keep Menu-specific work inside the Menu module folders unless a shared contract must change.

## Current Module Folders

```text
backend/modules/menu/
  __init__.py
  default_menu.json
  default_weekly_menu.json
  fetcher.py
  module.py
  router.py
  schemas.py
  service.py

frontend/src/modules/menu/
  api.ts
  defaultMenu.ts
  manifest.ts
  MenuGlance.css
  MenuGlance.tsx
  MenuWidget.css
  MenuWidget.tsx
  types.ts
```

Shared files touched by this module:

```text
backend/core/rbac.py
backend/schema.sql
frontend/src/types/campus.ts
```

Do not put Menu UI in the hub folder. The hub should only render the Menu manifest/widget and aggregate notifications.

`MenuGlance.tsx` is the dashboard widget. It should only show the next meal and the button into the full Foode page.

`MenuWidget.tsx` is the full Foode module page. It owns the weekly menu, ratings, sick meals, feedback, setup controls, and Food Committee tools.

## Access Model

Food Committee is a student designation, not a separate global role.

Current global roles:

- `student`
- `professor`
- `admin`

Current student designations:

- `food_committee`
- `teaching_assistant`

MVP headers:

```text
X-User-Role: student
X-User-Designations: food_committee
```

Menu access:

- Student: weekly menu, item ratings, sick meal requests, feedback.
- Food Committee designation: weekly menu upload/edit, ratings overview, sick meal queue, feedback inbox.
- Admin: module setup source, default app vs external website, central role/designation assignment.

## Setup Modes

The Menu module supports two setup modes:

- `external_website`: the campus uses an existing URL, for example `foodcommittee.iiitb.ac.in`.
- `default_app`: the campus uses CampusBuddy's built-in Menu app.

The frontend setup panel lives in `MenuWidget.tsx`. The backend config is served by:

```text
GET /api/modules/menu/config
PUT /api/modules/menu/config
```

Persisted config uses `module_configs` with `module_key = 'menu'`.

## Default App Scope

The default app currently includes:

- Dashboard glance for the next meal only.
- Full Foode page opened from the left navigation or the glance button.
- Daily menu tab for the selected day.
- Weekly menu grid.
- Ratings for items on every day and meal. Items become rateable once their meal has started.
- Timings tab with meal windows. Food Committee students can adjust these timings from the Food Committee tab.
- Sick meal request form and Food Committee queue.
- Feedback form and Food Committee inbox.
- Food Committee manual menu editor.
- Food Committee Excel upload.
- Upload reminder signal for Food Committee students before Monday menu publication.

The seed data in `default_weekly_menu.json` and `defaultMenu.ts` follows the provided `IIITB-Menu.xlsx` structure:

- Monday to Sunday columns.
- Breakfast, lunch, snacks, dinner sections.
- Menu items under each meal section.

The backend rewrites seed dates to the requested/current week so fallback data does not look stale.

Meal timings used by the frontend:

```text
Breakfast: 7:30 AM - 9:45 AM
Lunch: 12:30 PM - 2:00 PM
Snacks: 4:30 PM - 5:45 PM
Dinner: 7:30 PM - 9:30 PM
```

Default timing logic lives in `frontend/src/modules/menu/timings.ts`. Campus-adjusted timings are returned by the Menu workspace as `meal_timings`, stored in `module_configs.config_json.meal_timings`, and updated through `PUT /api/modules/menu/timings`.

## Excel Import

Excel import is intentionally dependency-light.

Frontend:

- `frontend/src/modules/menu/api.ts`
- Sends raw `.xlsx` or `.csv` bytes to the backend.
- Sets `X-Filename` to the uploaded file name.

Backend:

- `POST /api/modules/menu/import`
- Parser lives in `backend/modules/menu/service.py`.
- Uses Python standard library `zipfile` and `xml.etree.ElementTree`.
- Reads `xl/sharedStrings.xml` and `xl/worksheets/sheet1.xml`.
- Detects meal section headers: `BREAKFAST`, `LUNCH`, `SNACKS`, `DINNER`.

CSV template:

```text
docs/templates/foodcommittee_menu_upload_template.csv
```

Required CSV columns:

```text
week_start,date,day_name,meal_type,item_order,item_name,notes
```

CSV rules:

- One row per menu item.
- `week_start` should be the Monday date for the week, for example `2026-06-15`.
- `date` should be the exact item date. If blank, the backend uses `day_name` and `week_start`.
- `day_name` must be Monday through Sunday.
- `meal_type` must be `breakfast`, `lunch`, `snacks`, or `dinner`.
- `item_order` controls item ordering inside the meal.
- `item_name` is required.
- `notes` is optional and currently not displayed.

Do not add `python-multipart` unless the upload endpoint is deliberately changed to multipart form uploads.

## Backend Endpoint Summary

```text
GET  /api/modules/menu
GET  /api/modules/menu/today
GET  /api/modules/menu/workspace
GET  /api/modules/menu/config
PUT  /api/modules/menu/config
GET  /api/modules/menu/timings
PUT  /api/modules/menu/timings
GET  /api/modules/menu/week
PUT  /api/modules/menu/week
POST /api/modules/menu/import
POST /api/modules/menu/ratings
GET  /api/modules/menu/ratings
POST /api/modules/menu/sick-meals
GET  /api/modules/menu/sick-meals
PATCH /api/modules/menu/sick-meals/{record_id}
POST /api/modules/menu/feedback
GET  /api/modules/menu/feedback
PATCH /api/modules/menu/feedback/{record_id}
```

`GET /api/modules/menu/workspace` is the frontend's main read endpoint. It returns config, weekly menu, ratings, rating summary, sick meals, feedback, and the upload reminder.

## Persistence Notes

Weekly menu rows persist through the existing `meals` table:

```text
campus_id + date + meal_type -> items
```

Operational data uses module-prefixed tables:

```text
menu_item_ratings
menu_sick_meals
menu_feedback
```

If Supabase is not configured, the service returns preview-mode in-memory data so local demos still work.

## Next Improvements

- Move module setup out of each module into a central module marketplace once two or more modules need setup.
- Replace demo profile switching with real auth/user context.
- Add server-side aggregation from `menu_item_ratings` once Supabase tables are active.
- Add Food Committee actions for closing feedback and changing sick meal request status in the UI.
