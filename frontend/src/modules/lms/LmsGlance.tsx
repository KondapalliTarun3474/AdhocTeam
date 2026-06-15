import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackLmsWorkspace, fetchLmsWorkspace } from './api'
import type { LmsWorkspace } from './types'
import './Lms.css'

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function LmsGlance({ campusId, designations, isLoading, openModule, role, userId }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<LmsWorkspace>(() => fallbackLmsWorkspace(campusId, userId))

  useEffect(() => {
    let ignore = false
    fetchLmsWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const nextAssignment = useMemo(() => workspace.assignments[0], [workspace.assignments])

  return (
    <section className="academic-glance" aria-label="LMS glance">
      <div className="academic-glance-header">
        <div>
          <span>LMS</span>
          <h2>Next Deadline</h2>
        </div>
        <strong>{isLoading ? 'Loading' : `${workspace.assignments.length} due`}</strong>
      </div>
      {nextAssignment ? (
        <div className="academic-glance-body">
          <span>{nextAssignment.course_code}</span>
          <h3>{nextAssignment.title}</h3>
          <p>{formatDeadline(nextAssignment.deadline_at)}</p>
        </div>
      ) : (
        <p className="academic-empty">No assignments yet.</p>
      )}
      <button onClick={() => openModule?.('lms')} type="button">Open LMS</button>
    </section>
  )
}

export default LmsGlance
