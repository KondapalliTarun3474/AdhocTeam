import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackErpWorkspace, fetchErpWorkspace } from './api'
import type { ErpWorkspace } from './types'
import './Erp.css'

function ErpGlance({ campusId, designations, isLoading, openModule, role, userId }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<ErpWorkspace>(() => fallbackErpWorkspace(campusId, userId))

  useEffect(() => {
    let ignore = false
    fetchErpWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const nextClass = useMemo(() => workspace.personal_calendar.items.find((item) => item.type !== 'break'), [workspace])

  return (
    <section className="erp-glance" aria-label="ERP glance">
      <div className="erp-glance-header">
        <div>
          <span>ERP</span>
          <h2>Registered Courses</h2>
        </div>
        <strong>{isLoading ? 'Loading' : workspace.registered_course_ids.length}</strong>
      </div>
      {nextClass ? (
        <div className="erp-glance-body">
          <span>{workspace.personal_calendar.day_name}</span>
          <h3>{nextClass.label}</h3>
          <p>{nextClass.start_label} - {nextClass.end_label}</p>
        </div>
      ) : (
        <p className="erp-empty">No classes today.</p>
      )}
      <button onClick={() => openModule?.('erp')} type="button">Open ERP</button>
    </section>
  )
}

export default ErpGlance
