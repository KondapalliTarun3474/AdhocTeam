import type { FrontendModuleManifest } from '../../types/campus'
import AnnouncementsGlance from './AnnouncementsGlance'
import AnnouncementsPage from './AnnouncementsPage'

export const manifest: FrontendModuleManifest = {
  key: 'announcements',
  name: 'Announcements',
  summary: 'Inbox for course notices, quizzes, results, opportunities, events, and resources.',
  status: 'connected',
  roles: ['student', 'professor', 'staff', 'admin'],
  designations: ['teaching_assistant'],
  Page: AnnouncementsPage,
  Widget: AnnouncementsGlance,
}

export default manifest
