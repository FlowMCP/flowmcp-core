# Changelog

All notable changes to flowmcp-core are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.0.0] — 2026

**BREAKING: flowmcp-core is now v4-only.** The v1, v2, and legacy trees were removed.

### Removed
- The `./v1`, `./v2`, and `./legacy` export subpaths. The `exports` map now carries only `.` (the v4 surface, incl. the `FlowMCP` facade) and `./v4`.
- v1/v2 public methods including `activateServerTools`, `activateServerTool`, `filterArrayOfSchemas`, `prepareActivations`, and `getArgvParameters`. The v1 method-by-method reference remains available in the Git history.

### Changed
- The root export (`.`, i.e. `import { FlowMCP } from 'flowmcp-core'`) now resolves to the v4 surface. Build MCP servers with `FlowMCP.loadSchema()` + `FlowMCP.prepareServerTool()`.
- `./v4` is kept as an alias for **one** release, then removed — pin bumps should import from the bare root.

### Migration
- **SHA-pinned installs keep working**: consumers pinning `github:FlowMCP/flowmcp-core#<sha>` are unaffected because the old commits stay reachable in the Git history. Breakage only happens on a pin bump, for documentation readers, or for unpinned installs.
- Convert v1/v2/v3 schema files to the v4 format with the explicit `flowmcp migrate` converter (no implicit legacy adapter — validation is fail-loud).

## [3.0.0] — 2026

### Added
- v4 entry point (`flowmcp-core/v4`) — routes/tools, prompts, resources primitives.
- v2 entry point (`flowmcp-core/v2`) — MainValidator, Pipeline.

### Changed
- Multi-version export surface: `.`, `./legacy`, `./v1`, `./v2`, `./v4`.

### Notes
- Retrospective entry — pre-3.0 history captured via git log only.
