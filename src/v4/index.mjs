// Phase 1+2 — New modules
export { SelectionLoader } from './task/SelectionLoader.mjs'
export { SelectionValidator } from './task/SelectionValidator.mjs'
export { PlaceholderResolver } from './task/PlaceholderResolver.mjs'
export { PrefillExecutor } from './task/PrefillExecutor.mjs'
export { MetaGenerator } from './task/MetaGenerator.mjs'
export { GradeReporter } from './task/GradeReporter.mjs'
export { OutputSchemaGenerator } from './task/OutputSchemaGenerator.mjs'
export { SkillContentGenerator } from './task/SkillContentGenerator.mjs'

// Phase 3 — v4 versions of existing modules
export { MainValidator } from './task/MainValidator.mjs'
export { Pipeline } from './task/Pipeline.mjs'
export { AgentManifestValidator } from './task/AgentManifestValidator.mjs'
export { SkillValidator } from './task/SkillValidator.mjs'
export { IdResolver } from './task/IdResolver.mjs'

// Phase 4 — Resource handling
export { ResourceDatabaseManager } from './task/ResourceDatabaseManager.mjs'

// LibraryLoader is re-exported from v2 (allowlist fix + mergeAllowlist live there)
export { LibraryLoader } from '../v2/task/LibraryLoader.mjs'
