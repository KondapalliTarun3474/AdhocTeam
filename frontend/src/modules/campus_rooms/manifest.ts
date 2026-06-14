import type { FrontendModuleManifest } from '../../types/campus'
import CampusRoomsGlance from './CampusRoomsGlance'
import CampusRoomsPage from './CampusRoomsPage'

export const manifest: FrontendModuleManifest = {
  key: 'campus_rooms',
  name: 'Campus Room Tracker',
  summary: 'Room bookings, course-linked classes, and classroom support blocks.',
  status: 'connected',
  roles: ['student', 'professor', 'staff', 'admin'],
  designations: ['classroom_support', 'warden', 'security'],
  Page: CampusRoomsPage,
  Widget: CampusRoomsGlance,
}

export default manifest
