import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_CAMPUS_ID, fetchHubOverview } from '../../api/client'
import AssistantPanel from '../assistant/AssistantPanel'
import { moduleManifestByKey, moduleManifests } from '../registry'
import type { ComponentType } from 'react'
import type { HubOverview, ModuleWidgetProps, Role } from '../../types/campus'
import './HubDashboard.css'

const USER_ID = 'demo-student'

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'student', label: 'Student' },
  { value: 'food_committee', label: 'Food Committee' },
  { value: 'professor', label: 'Professor' },
  { value: 'teaching_assistant', label: 'TA' },
  { value: 'admin', label: 'Admin' },
]

interface ModuleWidgetEntry {
  key: string
  Widget: ComponentType<ModuleWidgetProps>
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${dateString}T00:00:00`))
}

function HubDashboard() {
  const [role, setRole] = useState<Role>('student')
  const [overview, setOverview] = useState<HubOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    setIsLoading(true)

    fetchHubOverview({
      campusId: DEFAULT_CAMPUS_ID,
      userId: USER_ID,
      role,
    }).then((data) => {
      if (!ignore) {
        setOverview(data)
        setIsLoading(false)
      }
    })

    return () => {
      ignore = true
    }
  }, [role])

  const connectedModules = useMemo(() => {
    return overview?.modules?.filter((module) => module.status === 'connected') ?? []
  }, [overview])

  const moduleWidgets = useMemo<ModuleWidgetEntry[]>(() => {
    if (!overview) return []

    return overview.modules
      .map((module) => {
        const manifest = moduleManifestByKey.get(module.key)
        return manifest?.Widget
          ? { key: module.key, Widget: manifest.Widget }
          : null
      })
      .filter((item): item is ModuleWidgetEntry => item !== null)
  }, [overview])

  const dateLabel = overview?.date ? formatDate(overview.date) : ''

  return (
    <div className="hub-shell">
      <header className="hub-header">
        <div>
          <p className="hub-kicker">AI Operating System for Student Life</p>
          <h1>CampusBuddy Hub</h1>
          <p className="hub-subtitle">
            Notifications, updates, calendar, and plug-in campus modules in one place.
          </p>
        </div>

        <div className="hub-role-panel" aria-label="Current role">
          <span>View as</span>
          <div className="hub-role-options">
            {ROLE_OPTIONS.map((option) => (
              <button
                className={option.value === role ? 'active' : ''}
                key={option.value}
                onClick={() => setRole(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="hub-main">
        <section className="hub-status-band">
          <div>
            <span className="hub-status-label">Today</span>
            <strong>{dateLabel}</strong>
          </div>
          <div>
            <span className="hub-status-label">Role</span>
            <strong>{ROLE_OPTIONS.find((item) => item.value === role)?.label}</strong>
          </div>
          <div>
            <span className="hub-status-label">Connected Modules</span>
            <strong>{connectedModules.length}</strong>
          </div>
        </section>

        <section className="hub-feed-grid" aria-label="Campus hub feed">
          <section className="hub-panel hub-notifications">
            <div className="hub-panel-heading">
              <span className="hub-panel-mark">!</span>
              <h2>Notifications</h2>
            </div>
            <div className="hub-list">
              {(overview?.notifications ?? []).map((item) => (
                <article className={`hub-list-item priority-${item.priority}`} key={item.id}>
                  <span>{item.module_key}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="hub-panel">
            <div className="hub-panel-heading">
              <span className="hub-panel-mark">U</span>
              <h2>New Updates</h2>
            </div>
            <div className="hub-list">
              {(overview?.updates ?? []).map((item) => (
                <article className="hub-list-item" key={`${item.module_key}-${item.title}`}>
                  <span>{item.module_key}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="hub-panel">
            <div className="hub-panel-heading">
              <span className="hub-panel-mark">C</span>
              <h2>Calendar</h2>
            </div>
            <div className="hub-calendar">
              {(overview?.calendar ?? []).map((item) => (
                <article className="hub-calendar-row" key={`${item.time}-${item.title}`}>
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.module_key}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="hub-module-grid" aria-label="Modules and assistant">
          <div className="hub-widget-stack">
            {moduleWidgets.map(({ key, Widget }) => (
              <Widget
                campusId={DEFAULT_CAMPUS_ID}
                isLoading={isLoading}
                key={key}
                overview={overview}
                role={role}
                userId={USER_ID}
              />
            ))}
          </div>
          <AssistantPanel
            campusId={DEFAULT_CAMPUS_ID}
            role={role}
            userId={USER_ID}
          />
        </section>

        <section className="hub-panel hub-module-catalog">
          <div className="hub-panel-heading">
            <span className="hub-panel-mark">M</span>
            <h2>Module Slots</h2>
          </div>
          <div className="hub-module-list">
            {(overview?.modules ?? moduleManifests).map((module) => (
              <article className="hub-module-card" key={module.key}>
                <div>
                  <h3>{module.name}</h3>
                  <p>{module.summary}</p>
                </div>
                <span className={`hub-module-status ${module.status}`}>
                  {module.status}
                </span>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default HubDashboard
