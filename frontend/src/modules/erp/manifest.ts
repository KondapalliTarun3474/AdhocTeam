import type { FrontendModuleManifest } from '../../types/campus'
import ErpGlance from './ErpGlance'
import ErpPage from './ErpPage'

export const manifest: FrontendModuleManifest = {
  key: 'erp',
  name: 'ERP',
  summary: 'Elective registration with timetable conflict checks and personal calendar.',
  status: 'connected',
  roles: ['student', 'professor', 'admin'],
  Page: ErpPage,
  Widget: ErpGlance,
}

export default manifest
