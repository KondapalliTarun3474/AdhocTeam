import { useMemo, useState } from 'react'
import { DEFAULT_CAMPUS_ID } from './api/client'
import { DEFAULT_USER_ID, DEMO_PROFILES } from './accessProfiles'
import HubAssistantPage from './modules/hub/HubAssistantPage'
import HubDashboard from './modules/hub/HubDashboard'
import HubCalendarPage from './modules/hub/HubCalendarPage'
import { moduleManifestByKey } from './modules/registry'
import type { ModuleKey } from './types/campus'
import campuzLogo from './assets/Campuz_Logo_PNG.png'
import './App.css'

type HubPageKey = 'hub' | 'hub_calendar' | 'hub_assistant'

const NAV_ITEMS: Array<{
  key: HubPageKey | ModuleKey
  label: string
  status: 'connected' | 'planned' | 'hub'
}> = [
  { key: 'hub', label: 'Hub', status: 'hub' },
  { key: 'hub_calendar', label: 'Calendar', status: 'hub' },
  { key: 'hub_assistant', label: 'AI Chat', status: 'hub' },
  { key: 'menu', label: 'Foode', status: 'connected' },
  { key: 'campus_rooms', label: 'Rooms', status: 'connected' },
  { key: 'campus_leave', label: 'Leave', status: 'connected' },
  { key: 'erp', label: 'ERP', status: 'connected' },
  { key: 'lms', label: 'LMS', status: 'connected' },
  { key: 'exam_lms', label: 'Exam Portal', status: 'connected' },
  { key: 'announcements', label: 'Announcements', status: 'connected' },
]

const HUB_PAGE_KEYS = new Set<string>(['hub', 'hub_calendar', 'hub_assistant'])

function App() {
  const [activePage, setActivePage] = useState<HubPageKey | ModuleKey>('hub')
  const [profileId, setProfileId] = useState('student')
  const activeProfile = useMemo(() => (
    DEMO_PROFILES.find((profile) => profile.id === profileId) ?? DEMO_PROFILES[0]
  ), [profileId])

  const activeModule = HUB_PAGE_KEYS.has(activePage)
    ? null
    : moduleManifestByKey.get(activePage)
  const ActiveModulePage = activeModule?.Page

  return (
    <div className="app app-shell">
      <aside className="app-sidebar" aria-label="Campus modules">
        <div className="app-brand">
          <img src={campuzLogo} alt="campuz" />
          <strong>Campus hub</strong>
        </div>
        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <button
              className={activePage === item.key ? 'active' : ''}
              key={item.key}
              onClick={() => setActivePage(item.key)}
              type="button"
            >
              <span>{item.label}</span>
              <em>{item.status}</em>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-content">
        {activePage === 'hub' ? (
          <HubDashboard
            activeProfile={activeProfile}
            onOpenHubPage={(pageKey) => setActivePage(pageKey)}
            onOpenModule={(moduleKey) => setActivePage(moduleKey)}
            onProfileChange={setProfileId}
            profileId={profileId}
          />
        ) : activePage === 'hub_calendar' ? (
          <HubCalendarPage
            activeProfile={activeProfile}
            onOpenModule={(moduleKey) => setActivePage(moduleKey)}
          />
        ) : activePage === 'hub_assistant' ? (
          <HubAssistantPage activeProfile={activeProfile} />
        ) : ActiveModulePage ? (
          <ActiveModulePage
            campusId={DEFAULT_CAMPUS_ID}
            designations={activeProfile.designations}
            isLoading={false}
            openModule={(moduleKey) => setActivePage(moduleKey)}
            overview={null}
            role={activeProfile.role}
            userId={DEFAULT_USER_ID}
          />
        ) : (
          <section className="app-planned-page">
            <span>{activeModule?.status ?? 'planned'}</span>
            <h1>{NAV_ITEMS.find((item) => item.key === activePage)?.label}</h1>
            <p>{activeModule?.summary ?? 'This module will plug into the hub when its folder is added.'}</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
