import type { FrontendModuleManifest } from '../../types/campus'
import LmsGlance from './LmsGlance'
import LmsPage from './LmsPage'

export const manifest: FrontendModuleManifest = {
  key: 'lms',
  name: 'LMS',
  summary: 'Assignments, deadlines, and PDF submissions for registered courses.',
  status: 'connected',
  roles: ['student', 'professor', 'admin'],
  designations: ['teaching_assistant'],
  Page: LmsPage,
  Widget: LmsGlance,
}

export default manifest
