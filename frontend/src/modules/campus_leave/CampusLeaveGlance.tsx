import { useEffect, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fetchLeaveWorkspace } from './api'
import { fallbackLeaveWorkspace } from './defaultLeave'
import type { CampusLeaveWorkspace } from './types'
import './CampusLeave.css'

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
}

function CampusLeaveGlance({
  campusId,
  designations,
  isLoading,
  openModule,
  role,
  userId,
}: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<CampusLeaveWorkspace>(() => fallbackLeaveWorkspace(campusId, userId))

  useEffect(() => {
    let ignore = false
    fetchLeaveWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) {
        setWorkspace(data)
      }
    })

    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const latest = workspace.applications[0]
  const pendingCount = workspace.all_applications.filter((application) => (
    application.status === 'submitted' || application.status === 'warden_approved'
  )).length
  const staffView = role === 'admin' || designations.includes('security') || designations.includes('warden')

  return (
    <section className="leave-glance" aria-label="Leave application glance">
      <div className="leave-glance-header">
        <div>
          <span>Leave</span>
          <h2>{staffView ? 'Pending Queue' : 'Latest Application'}</h2>
        </div>
        <strong>{isLoading ? 'Loading' : `${workspace.curfew_violations} curfew`}</strong>
      </div>

      {staffView ? (
        <div className="leave-glance-body">
          <span>Security and Warden</span>
          <h3>{pendingCount} pending</h3>
          <p>{workspace.student_directory.length} students in room directory</p>
        </div>
      ) : latest ? (
        <div className="leave-glance-body">
          <span>{latest.from_date} - {latest.to_date}</span>
          <h3>{latest.leave_type}</h3>
          <p>{titleCase(latest.status)}</p>
        </div>
      ) : (
        <p className="leave-empty">No leave applications yet.</p>
      )}

      <button onClick={() => openModule?.('campus_leave')} type="button">
        Open Leave
      </button>
    </section>
  )
}

export default CampusLeaveGlance
