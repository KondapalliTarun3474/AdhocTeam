import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackAnnouncementsWorkspace, fetchAnnouncementsWorkspace } from './api'
import type { AnnouncementsWorkspace } from './types'
import './Announcements.css'

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function AnnouncementsGlance({ campusId, designations, isLoading, openModule, role }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<AnnouncementsWorkspace>(() => (
    fallbackAnnouncementsWorkspace(campusId)
  ))

  useEffect(() => {
    let ignore = false
    fetchAnnouncementsWorkspace(campusId, role, designations).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, role, designations])

  const latest = useMemo(() => workspace.announcements[0], [workspace.announcements])

  return (
    <section className="announcements-glance" aria-label="Announcements glance">
      <div className="announcements-glance-header">
        <div>
          <span>Announcements</span>
          <h2>Inbox</h2>
        </div>
        <strong>{isLoading ? 'Loading' : workspace.announcements.length}</strong>
      </div>
      {latest ? (
        <div className={`announcements-glance-body priority-${latest.priority}`}>
          <span>{latest.category} · {latest.tag}</span>
          <h3>{latest.title}</h3>
          <p>{formatCreatedAt(latest.created_at)}</p>
        </div>
      ) : (
        <p className="announcements-empty">No announcements yet.</p>
      )}
      <button onClick={() => openModule?.('announcements')} type="button">Open Inbox</button>
    </section>
  )
}

export default AnnouncementsGlance
