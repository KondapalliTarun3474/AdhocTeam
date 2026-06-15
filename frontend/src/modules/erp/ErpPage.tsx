import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { dropCourse, fallbackErpWorkspace, fetchErpWorkspace, registerCourse } from './api'
import type { ErpWorkspace } from './types'
import './Erp.css'

function ErpPage({ campusId, designations, role, userId }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<ErpWorkspace>(() => fallbackErpWorkspace(campusId, userId))
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let ignore = false
    fetchErpWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const departments = useMemo(() => (
    Array.from(new Set(workspace.courses.map((course) => course.department))).sort()
  ), [workspace.courses])

  const visibleCourses = useMemo(() => (
    department === 'all'
      ? workspace.courses
      : workspace.courses.filter((course) => course.department === department)
  ), [department, workspace.courses])

  const handleRegister = async (courseId: string) => {
    const response = await registerCourse(workspace, courseId, role, designations)
    if (response.status === 'error') {
      const conflict = response.conflicts?.[0]
      setStatus(conflict
        ? `${response.message} Conflict: ${conflict.day} ${conflict.start_label} with ${conflict.conflicts_with}.`
        : response.message ?? 'Registration blocked.')
      return
    }
    if (response.data) setWorkspace(response.data)
    setStatus(response.status === 'preview' ? 'Registration previewed locally.' : 'Registered.')
  }

  const handleDrop = async (courseId: string) => {
    const response = await dropCourse(workspace, courseId, role, designations)
    if (response.data) setWorkspace(response.data)
    setStatus(response.status === 'preview' ? 'Drop previewed locally.' : 'Dropped course.')
  }

  return (
    <section className="erp-page">
      <header className="erp-page-header">
        <div>
          <span>Enterprise Resource Planning</span>
          <h2>Course Registration</h2>
        </div>
        <strong>{workspace.registered_course_ids.length} registered</strong>
      </header>

      <section className="erp-toolbar">
        <label>
          Department
          <select onChange={(event) => setDepartment(event.target.value)} value={department}>
            <option value="all">All departments</option>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </section>

      <section className="erp-registered">
        <div className="erp-section-heading">
          <span>Personal Calendar</span>
          <h3>{workspace.personal_calendar.day_name}</h3>
        </div>
        <div className="erp-calendar-row">
          {workspace.personal_calendar.items.length === 0 && <p>No classes today.</p>}
          {workspace.personal_calendar.items.map((item) => (
            <article className={`erp-calendar-item ${item.color_key}`} key={item.id}>
              <strong>{item.start_label} - {item.end_label}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="erp-course-grid">
        {visibleCourses.map((course) => {
          const registered = workspace.registered_course_ids.includes(course.course_id)
          return (
            <article className="erp-course-card" key={course.course_id}>
              <span>{course.department}</span>
              <h3>{course.course_code}</h3>
              <p>{course.course_name}</p>
              <em>{course.professor_name}</em>
              <strong>{course.raw_timings} · {course.room}</strong>
              <button
                className={registered ? 'registered' : ''}
                onClick={() => registered ? handleDrop(course.course_id) : handleRegister(course.course_id)}
                type="button"
              >
                {registered ? 'Drop' : 'Register'}
              </button>
            </article>
          )
        })}
      </div>

      {status && <p className="erp-status">{status}</p>}
    </section>
  )
}

export default ErpPage
