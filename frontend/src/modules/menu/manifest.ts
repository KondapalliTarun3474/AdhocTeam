import type { FrontendModuleManifest } from '../../types/campus'
import MenuWidget from './MenuWidget'

export const manifest: FrontendModuleManifest = {
  key: 'menu',
  name: 'Menu',
  summary: 'Today meals, food committee updates, and student reviews.',
  status: 'connected',
  roles: ['student', 'food_committee', 'admin'],
  Widget: MenuWidget,
}

export default manifest
