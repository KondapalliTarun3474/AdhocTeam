import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackExamWorkspace, fetchExamWorkspace } from './api'
import type { ExamWorkspace } from './types'
import './Exam.css'

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function ExamGlance({ campusId, designations, isLoading, openModule, role, userId }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<ExamWorkspace>(() => fallbackExamWorkspace(campusId, userId))

  useEffect(() => {
    let ignore = false
    fetchExamWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const nextQuiz = useMemo(() => workspace.quizzes[0], [workspace.quizzes])

  return (
    <section className="exam-glance" aria-label="Exam portal glance">
      <div className="exam-glance-header">
        <div>
          <span>Exam Portal</span>
          <h2>Next Quiz</h2>
        </div>
        <strong>{isLoading ? 'Loading' : `${workspace.quizzes.length} quizzes`}</strong>
      </div>
      {nextQuiz ? (
        <div className="exam-glance-body">
          <span>{nextQuiz.course_code}</span>
          <h3>{nextQuiz.title}</h3>
          <p>{formatTime(nextQuiz.start_at)}</p>
        </div>
      ) : (
        <p className="exam-empty">No quizzes scheduled.</p>
      )}
      <button onClick={() => openModule?.('exam_lms')} type="button">Open Exams</button>
    </section>
  )
}

export default ExamGlance
