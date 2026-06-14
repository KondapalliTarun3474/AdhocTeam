import type { FrontendModuleManifest } from '../types/campus'

type ManifestModule = {
  default?: FrontendModuleManifest
  manifest?: FrontendModuleManifest
}

const manifestModules = import.meta.glob<ManifestModule>('./*/manifest.ts', {
  eager: true,
})

export const moduleManifests = Object.values(manifestModules)
  .map((module) => module.default ?? module.manifest)
  .filter((manifest): manifest is FrontendModuleManifest => Boolean(manifest))
  .sort((a, b) => a.name.localeCompare(b.name))

export const moduleManifestByKey = new Map(
  moduleManifests.map((manifest) => [manifest.key, manifest]),
)
