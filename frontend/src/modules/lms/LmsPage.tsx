import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackLmsWorkspace, fetchLmsWorkspace, submitAssignmentPdf } from './api'
import type { AssignmentRecord, LmsWorkspace } from './types'
import './Lms.css'

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function LmsPage({ campusId, designations, role, userId }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<LmsWorkspace>(() => fallbackLmsWorkspace(campusId, userId))
  const [courseFilter, setCourseFilter] = useState('all')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let ignore = false
    fetchLmsWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const filteredAssignments = useMemo(() => (
    courseFilter === 'all'
      ? workspace.assignments
      : workspace.assignments.filter((assignment) => assignment.course_id === courseFilter)
  ), [courseFilter, workspace.assignments])

  const hasSubmission = (assignment: AssignmentRecord) => workspace.submissions.some((submission) => (
    submission.assignment_id === assignment.id && submission.user_id === userId
  ))

  const handleUpload = async (assignment: AssignmentRecord, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('Only PDF submissions are accepted.')
      event.target.value = ''
      return
    }
    setStatus(`Uploading ${file.name}...`)
    const response = await submitAssignmentPdf(file, assignment, userId, role, designations)
    if (response.data) {
      setWorkspace((current) => ({
        ...current,
        submissions: [
          ...current.submissions.filter((submission) => submission.assignment_id !== assignment.id),
          response.data!,
        ],
      }))
    }
    setStatus(response.status === 'preview' ? 'PDF submission previewed locally.' : 'PDF submitted.')
    event.target.value = ''
  }

  return (
    <section className="academic-page">
      <header className="academic-page-header">
        <div>
          <span>Learning Management System</span>
          <h2>LMS</h2>
        </div>
        <strong>{workspace.assignments.length} assignments</strong>
      </header>

      <section className="academic-toolbar">
        <label>
          Course
          <select onChange={(event) => setCourseFilter(event.target.value)} value={courseFilter}>
            <option value="all">All registered courses</option>
            {workspace.courses.map((course) => (
              <option key={course.course_id} value={course.course_id}>
                {course.course_code} - {course.course_name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="academic-list">
        {filteredAssignments.map((assignment) => (
          <article className="academic-card" key={assignment.id}>
            <div>
              <span>{assignment.course_code}</span>
              <h3>{assignment.title}</h3>
              <p>{assignment.description}</p>
              <em>{assignment.course_name}</em>
            </div>
            <div className="academic-card-side">
              <strong>{formatDeadline(assignment.deadline_at)}</strong>
              <label className="academic-upload">
                <input
                  accept="application/pdf,.pdf"
                  onChange={(event) => handleUpload(assignment, event)}
                  type="file"
                />
                {hasSubmission(assignment) ? 'Replace PDF' : 'Submit PDF'}
              </label>
              {hasSubmission(assignment) && <span className="academic-pill">Submitted</span>}
            </div>
          </article>
        ))}
      </div>

      {status && <p className="academic-status">{status}</p>}
    </section>
  )
}

export default LmsPage
