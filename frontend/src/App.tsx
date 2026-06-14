import { useMemo, useState } from 'react'
import { DEFAULT_CAMPUS_ID } from './api/client'
import { DEFAULT_USER_ID, DEMO_PROFILES } from './accessProfiles'
import HubDashboard from './modules/hub/HubDashboard'
import { moduleManifestByKey } from './modules/registry'
import type { ModuleKey } from './types/campus'
import './App.css'

const NAV_ITEMS: Array<{
  key: 'hub' | ModuleKey
  label: string
  status: 'connected' | 'planned'
}> = [
  { key: 'hub', label: 'Hub', status: 'connected' },
  { key: 'menu', label: 'Foode', status: 'connected' },
  { key: 'campus_rooms', label: 'Rooms', status: 'connected' },
  { key: 'campus_leave', label: 'Leave', status: 'connected' },
  { key: 'lms', label: 'LMS', status: 'planned' },
  { key: 'erp', label: 'ERP', status: 'planned' },
  { key: 'exam_lms', label: 'Exam LMS', status: 'planned' },
]

function App() {
  const [activePage, setActivePage] = useState<'hub' | ModuleKey>('hub')
  const [profileId, setProfileId] = useState('student')
  const activeProfile = useMemo(() => (
    DEMO_PROFILES.find((profile) => profile.id === profileId) ?? DEMO_PROFILES[0]
  ), [profileId])

  const activeModule = activePage === 'hub'
    ? null
    : moduleManifestByKey.get(activePage)
  const ActiveModulePage = activeModule?.Page

  return (
    <div className="app app-shell">
      <aside className="app-sidebar" aria-label="Campus modules">
        <div className="app-brand">
          <span>CampusBuddy</span>
          <strong>Hub</strong>
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
            onOpenModule={(moduleKey) => setActivePage(moduleKey)}
            onProfileChange={setProfileId}
            profileId={profileId}
          />
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
