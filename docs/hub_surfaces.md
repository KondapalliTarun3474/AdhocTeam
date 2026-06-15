# Hub-Owned Surfaces

Personal Calendar and AI Chat are part of the Hub. They are not plug-in modules and should not get `manifest.ts` files.

## Current Hub Surfaces

```text
frontend/src/modules/hub/
  HubDashboard.tsx
  HubDashboard.css
  HubCalendarPage.tsx
  HubCalendarPage.css
  HubAssistantPage.tsx
  HubAssistantPage.css
  hubCalendar.ts
```

Routes are owned by `frontend/src/App.tsx`:

- `hub`: dashboard glance
- `hub_calendar`: full student calendar
- `hub_assistant`: standalone assistant workspace

The sidebar may show these entries, but their status should be `hub`, not `connected`, because they are not independently pluggable apps.

## Phase 1: Calendar

Implemented:

- Hub dashboard keeps a daily calendar glance.
- Full Hub Calendar page has Day, Week, and Agenda views.
- Calendar combines ERP classes, LMS deadlines, Exam Portal quizzes, and computed breaks.
- Calendar summary buttons can open the owning modules for full workflows.

Keep the detailed registration, assignment, and exam workflows in their modules. The Hub Calendar should aggregate, not own those workflows.

## Phase 2: Assistant Workspace

Implemented:

- Hub dashboard keeps compact chat.
- Full Hub Assistant page supports a larger thread and focus mode.
- Assistant can render text, code blocks, tables, bar-style charts, canvas boards, and mock quiz cards.
- Prompt suggestions can be posted back to the assistant.
- Voice input and TTS controls are exposed from the standalone chat surface.

The current rich blocks are frontend-rendered assistant artifacts. The backend assistant still returns text. Later, the backend can return structured artifact JSON directly.

## Voice Strategy

Do not add a paid or vendor speech stack by default.

Open-source production targets:

- STT: Whisper.cpp or a Whisper WASM adapter.
- TTS: Piper.

The current browser UI includes a provider boundary and uses browser speech support as a local preview when available. Production wiring should add local backend endpoints or a local worker adapter without changing the Hub Assistant UI.

Recommended future API shape:

```text
POST /api/hub/voice/transcribe
POST /api/hub/voice/speak
```

Those endpoints should be Hub endpoints, not module endpoints.

## Next Expansion Ideas

Ask before implementing these:

- Study planner that writes suggested study blocks into free calendar slots.
- Conflict warnings for leave applications and course registration.
- Assistant artifacts that can be saved and reopened.
- Mock quizzes with grading state and per-course difficulty.
- Notification rules per student for deadlines, exams, placements, hackathons, meals, and leave.
- Professor/TA announcement drafting from the assistant.
- Calendar export to `.ics`.
