import type { FrontendModuleManifest } from '../../types/campus'
import MenuGlance from './MenuGlance'
import MenuWidget from './MenuWidget'

export const manifest: FrontendModuleManifest = {
  key: 'menu',
  name: 'Foode',
  summary: 'Weekly meals, item ratings, sick meals, and feedback.',
  status: 'connected',
  roles: ['student', 'admin'],
  designations: ['food_committee'],
  Page: MenuWidget,
  Widget: MenuGlance,
}

export default manifest
