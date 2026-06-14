import type { FrontendModuleManifest } from '../../types/campus'
import CampusLeaveGlance from './CampusLeaveGlance'
import CampusLeavePage from './CampusLeavePage'

export const manifest: FrontendModuleManifest = {
  key: 'campus_leave',
  name: 'Leave Application',
  summary: 'Leave requests, guardian contacts, curfew records, security, and warden views.',
  status: 'connected',
  roles: ['student', 'staff', 'admin'],
  designations: ['security', 'warden'],
  Page: CampusLeavePage,
  Widget: CampusLeaveGlance,
}

export default manifest
