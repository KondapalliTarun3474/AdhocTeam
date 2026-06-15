import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackExamWorkspace, fetchExamWorkspace } from './api'
import type { ExamWorkspace, QuizRecord } from './types'
import './Exam.css'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function ExamPage({ campusId, designations, role, userId }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<ExamWorkspace>(() => fallbackExamWorkspace(campusId, userId))
  const [courseFilter, setCourseFilter] = useState('all')

  useEffect(() => {
    let ignore = false
    fetchExamWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const visibleQuizzes = useMemo(() => (
    courseFilter === 'all'
      ? workspace.quizzes
      : workspace.quizzes.filter((quiz) => quiz.course_id === courseFilter)
  ), [courseFilter, workspace.quizzes])

  const scoreFor = (quiz: QuizRecord) => workspace.scores.find((score) => score.quiz_id === quiz.id)

  return (
    <section className="exam-page">
      <header className="exam-page-header">
        <div>
          <span>Exam Portal</span>
          <h2>Quizzes and Scores</h2>
        </div>
        <strong>{workspace.quizzes.length} scheduled</strong>
      </header>

      <section className="exam-toolbar">
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

      <div className="exam-list">
        {visibleQuizzes.map((quiz) => {
          const score = scoreFor(quiz)
          return (
            <article className="exam-card" key={quiz.id}>
              <div>
                <span>{quiz.course_code}</span>
                <h3>{quiz.title}</h3>
                <p>{quiz.course_name}</p>
                <em>{quiz.room_name}</em>
              </div>
              <div className="exam-card-side">
                <strong>{formatDateTime(quiz.start_at)}</strong>
                <span>{formatDateTime(quiz.end_at)}</span>
                <b>{score?.released ? `${score.score}/${score.max_score}` : 'Score pending'}</b>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default ExamPage
