import type { FrontendModuleManifest } from '../../types/campus'
import ExamGlance from './ExamGlance'
import ExamPage from './ExamPage'

export const manifest: FrontendModuleManifest = {
  key: 'exam_lms',
  name: 'Exam Portal',
  summary: 'Quiz schedule, start and end times, and released scores.',
  status: 'connected',
  roles: ['student', 'professor', 'admin'],
  designations: ['teaching_assistant'],
  Page: ExamPage,
  Widget: ExamGlance,
}

export default manifest
