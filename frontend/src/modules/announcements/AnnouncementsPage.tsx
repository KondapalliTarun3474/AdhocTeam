import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackCourses } from '../academics/catalog'
import {
  createAnnouncement,
  fallbackAnnouncementsWorkspace,
  fetchAnnouncementsWorkspace,
  type AnnouncementFilters,
} from './api'
import type { AnnouncementPriority, AnnouncementsWorkspace } from './types'
import './Announcements.css'

const CATEGORY_OPTIONS = ['Courses', 'Hackathons', 'Volunteering', 'Events', 'Placements', 'Resources']
const TAG_OPTIONS = ['Assignment', 'Quiz', 'Results', 'Hackathon', 'Volunteering', 'Event', 'Placement', 'Resource']

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function AnnouncementsPage({ campusId, designations, role, userId }: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<AnnouncementsWorkspace>(() => (
    fallbackAnnouncementsWorkspace(campusId)
  ))
  const [category, setCategory] = useState('all')
  const [tag, setTag] = useState('all')
  const [courseId, setCourseId] = useState('all')
  const [status, setStatus] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [createCategory, setCreateCategory] = useState('Courses')
  const [createTag, setCreateTag] = useState('Assignment')
  const [createCourseId, setCreateCourseId] = useState('')
  const [priority, setPriority] = useState<AnnouncementPriority>('normal')

  const courses = useMemo(() => fallbackCourses(campusId), [campusId])
  const canCreate = role === 'professor' || role === 'admin' || designations.includes('teaching_assistant')
  const activeFilters: AnnouncementFilters = useMemo(() => ({
    category: category === 'all' ? undefined : category,
    tag: tag === 'all' ? undefined : tag,
    courseId: courseId === 'all' ? undefined : courseId,
  }), [category, tag, courseId])

  useEffect(() => {
    let ignore = false
    fetchAnnouncementsWorkspace(campusId, role, designations, activeFilters).then((data) => {
      if (!ignore) setWorkspace(data)
    })
    return () => {
      ignore = true
    }
  }, [campusId, role, designations, activeFilters])

  const filterCourses = useMemo(() => {
    const courseMap = new Map<string, string>()
    workspace.announcements.forEach((item) => {
      if (item.course_id && item.course_code) {
        courseMap.set(item.course_id, `${item.course_code} - ${item.course_name}`)
      }
    })
    courses.forEach((course) => {
      courseMap.set(course.course_id, `${course.course_code} - ${course.course_name}`)
    })
    return Array.from(courseMap.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [courses, workspace.announcements])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !body.trim()) {
      setStatus('Title and body are required.')
      return
    }

    const response = await createAnnouncement({
      campus_id: campusId,
      title: title.trim(),
      body: body.trim(),
      category: createCategory,
      tag: createTag,
      created_by: userId,
      created_by_name: role === 'admin' ? 'Admin' : role === 'professor' ? 'Professor' : 'Teaching Assistant',
      audience: createCategory === 'Courses' ? 'students' : 'campus',
      course_id: createCategory === 'Courses' ? createCourseId || null : null,
      priority,
    }, role, designations)

    if (response.data) {
      setWorkspace((current) => ({
        ...current,
        announcements: [response.data!, ...current.announcements],
        categories: Array.from(new Set([...current.categories, response.data!.category])).sort(),
        tags: Array.from(new Set([...current.tags, response.data!.tag])).sort(),
      }))
    }
    setTitle('')
    setBody('')
    setStatus(response.status === 'preview' ? 'Announcement previewed locally.' : 'Announcement sent.')
  }

  return (
    <section className="announcements-page">
      <header className="announcements-page-header">
        <div>
          <span>Announcements</span>
          <h2>Campus Inbox</h2>
        </div>
        <strong>{workspace.announcements.length} notices</strong>
      </header>

      <section className="announcements-toolbar">
        <label>
          Category
          <select onChange={(event) => setCategory(event.target.value)} value={category}>
            <option value="all">All categories</option>
            {workspace.categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Tag
          <select onChange={(event) => setTag(event.target.value)} value={tag}>
            <option value="all">All tags</option>
            {workspace.tags.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Course
          <select onChange={(event) => setCourseId(event.target.value)} value={courseId}>
            <option value="all">All courses</option>
            {filterCourses.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </section>

      {canCreate && (
        <form className="announcements-composer" onSubmit={handleCreate}>
          <div className="announcements-composer-grid">
            <label>
              Category
              <select onChange={(event) => setCreateCategory(event.target.value)} value={createCategory}>
                {CATEGORY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Tag
              <select onChange={(event) => setCreateTag(event.target.value)} value={createTag}>
                {TAG_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Priority
              <select
                onChange={(event) => setPriority(event.target.value as AnnouncementPriority)}
                value={priority}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              Course
              <select
                disabled={createCategory !== 'Courses'}
                onChange={(event) => setCreateCourseId(event.target.value)}
                value={createCourseId}
              >
                <option value="">Campus-wide or no course</option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_code} - {course.course_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Title
            <input onChange={(event) => setTitle(event.target.value)} value={title} />
          </label>
          <label>
            Body
            <textarea onChange={(event) => setBody(event.target.value)} rows={4} value={body} />
          </label>
          <button type="submit">Send Announcement</button>
        </form>
      )}

      <div className="announcements-list">
        {workspace.announcements.map((announcement) => (
          <article className={`announcements-card priority-${announcement.priority}`} key={announcement.id}>
            <div>
              <span>{announcement.category} · {announcement.tag}</span>
              <h3>{announcement.title}</h3>
              <p>{announcement.body}</p>
              {announcement.course_code && (
                <em>{announcement.course_code} - {announcement.course_name}</em>
              )}
            </div>
            <aside>
              <strong>{announcement.created_by_name}</strong>
              <time>{formatDateTime(announcement.created_at)}</time>
              <b>{announcement.audience}</b>
            </aside>
          </article>
        ))}
      </div>

      {status && <p className="announcements-status">{status}</p>}
    </section>
  )
}

export default AnnouncementsPage
