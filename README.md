[![Test](https://img.shields.io/github/actions/workflow/status/FlowMCP/flowmcp-core/test-on-release.yml)]() ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# FlowMCP Core

A comprehensive framework for adapting existing web APIs into a standardized Model Context Protocol (MCP) interface, enabling structured, testable, and semantically consistent access for AI systems. FlowMCP Core transforms any REST API into MCP-compatible tools with built-in validation, testing, and error handling.

## Features

- **v4 Pipeline**: 16-step orchestrated load with security scan, legacy adapter, validators, library loader, selections, handlers, skills, placeholder resolution, resource DB, and prompts
- **Selections (5th Primitive)**: First-class operator-curated tool subsets via `SelectionLoader` and `SelectionValidator`
- **Grade Report**: Automated A–F schema quality grading via `GradeReporter` (eval prompts + deterministic scoring)
- **Placeholder Resolution**: 12 placeholder types resolved against a typed catalog (tools, resources, prompts, skills, sharedLists, inputs, prefill)
- **Capture Flow**: Live response capture with `OutputSchemaGenerator` to auto-derive output schemas from real API responses
- **One-Shot Skills**: `SkillContentGenerator` renders self-contained skill content from schema + sharedLists
- **Meta-Block per Tool**: Every v4 tool declares `isReadOnly`, `isConcurrencySafe`, `isDestructive`, `searchHint`, `aliases`, `alwaysLoad` — generated/validated via `MetaGenerator`
- **Skills-only Sonderpfad**: Schemas with `tools: {}` are recognised after validation and short-circuit the pipeline (Schritte 7–9, 11–15 skipped)
- **Library Loading**: Allowlisted runtime library injection through `LibraryLoader` (with `mergeAllowlist`)
- **Resource Database Manager**: SQLite-backed resource initialisation via `ResourceDatabaseManager`
- **Security Scanner**: Static scan for forbidden patterns (eval, imports) before any module is loaded
- **Legacy Compatibility**: v1 and v2 APIs remain available under `flowmcp-core/legacy`, `flowmcp-core/v1`, `flowmcp-core/v2`

## Table of Contents

- [FlowMCP Core](#flowmcp-core)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Quick Start (v4)](#quick-start-v4)
  - [v4 Public API](#v4-public-api)
  - [v4 Schema Structure](#v4-schema-structure)
  - [Legacy API (v1 / v2)](#legacy-api-v1--v2)
  - [Error Handling](#error-handling)
  - [Testing & Validation](#testing--validation)
  - [Performance & Optimization](#performance--optimization)
  - [Documentation](#documentation)

## Quick Start (v4)

```js
import * as v4 from 'flowmcp-core/v4'

const { Pipeline } = v4

// v4 Pipeline — loads, validates, and returns a result-Objekt
const result = await Pipeline
    .load( {
        filePath: './schemas/etherscan-io/etherscan.mjs',
        listsDir: './schemas/shared/lists',
        allowlist: null,
        selectionFiles: [],
        prefillTimeout: 1000,
        fetchFn: null,
        userParams: {}
    } )

if( !result.status ) {
    console.error( 'Pipeline failed:', result.messages )
    return
}

// Result object contains all primitives:
//   main, handlerMap, resourceHandlerMap, sharedLists, libraries,
//   skills, selections, prompts, contentMap, prefillResults, warnings
console.log( 'Tools available:', Object.keys( result.main.tools ) )
console.log( 'Skills loaded:', Object.keys( result.skills ) )
console.log( 'Warnings:', result.warnings )
```

### Grade Report

```js
import * as v4 from 'flowmcp-core/v4'

const { GradeReporter } = v4

const { prompts } = GradeReporter
    .buildEvalPrompts( { schema: result.main, skill: null } )

const { grade, scoreSummary } = GradeReporter
    .grade( {
        schemaId: 'etherscan/4.0.0',
        deterministicResult: { passed: true },
        scores: { coverage: 90, accuracy: 85, clarity: 80 },
        validatorVersion: '4.0.0'
    } )

console.log( 'Grade:', grade )         // 'A' | 'B' | 'C' | 'D' | 'F'
console.log( 'Summary:', scoreSummary )
```

## v4 Public API

The v4 API is exported via `flowmcp-core/v4`. Each module is a focused, static class with a small public surface (1–3 methods per module). Internal helpers stay private.

| Module | Public Methods |
|--------|----------------|
| `Pipeline` | `load({ filePath, listsDir, allowlist, selectionFiles, prefillTimeout, fetchFn, userParams })` |
| `MainValidator` | `validate({ main })` |
| `SelectionLoader` | `load({ filePath })` |
| `SelectionValidator` | `validate({ selection })` |
| `PlaceholderResolver` | `resolve({ content, catalog, sharedLists, inputs, prefillResults })` |
| `PrefillExecutor` | `execute({ skill, userParams, fetchFn, timeout })` |
| `MetaGenerator` | `generate({ tool })`, `generateForSchema({ tools })` |
| `GradeReporter` | `buildEvalPrompts({ schema, skill })`, `grade({ schemaId, deterministicResult, scores, validatorVersion })` |
| `OutputSchemaGenerator` | `generateFromResponse({ response, mimeType, schemaId })` |
| `SkillContentGenerator` | `generate({ schemas, sharedLists })` |
| `SkillValidator` | `validate({ skills, tools, resources })` |
| `AgentManifestValidator` | `validate({ manifest })` |
| `IdResolver` | `resolve({ reference, catalog })` |
| `LibraryLoader` | `load({ requiredLibraries, allowlist })`, `getDefaultAllowlist()`, `mergeAllowlist({ extraAllowlist })` |
| `ResourceDatabaseManager` | `initialize({ resources, schemaRef, schemaDir })` |

### Pipeline.load() Return Shape

```js
{
    status: true,                // Boolean — overall success
    messages: [],                // Error messages when status === false
    main,                        // The validated v4 `main` object
    handlerMap: {},              // Per-tool handler functions
    resourceHandlerMap: {},      // Per-resource handler functions
    sharedLists: {},             // Resolved shared lists
    libraries: {},               // Loaded libraries (allowlist-filtered)
    skills: {},                  // Skills with resolved content
    selections: {},              // Loaded selection files
    prompts: {},                 // Loaded prompts
    contentMap: null,            // Map produced by SkillContentGenerator
    prefillResults: null,        // Map produced by PrefillExecutor
    warnings: []                 // Non-fatal warnings
}
```

### Skills-only Sonderpfad

When `Object.keys( main.tools ).length === 0` the pipeline takes a Sonderpfad after step 6: HandlerFactory, SelectionLoader, PrefillExecutor, PlaceholderResolver, ResourceValidator, and PromptLoader are all skipped. `handlerMap` and `resourceHandlerMap` return `{}`. Note: `main.skills` is forbidden in v4 — use the top-level `skills` export instead. The Sonderpfad therefore returns `skills: {}` for v4 schemas.

## v4 Schema Structure

A v4 schema declares `export const main` with `version: '4.0.0'` and (optionally) `export const handlers` as a factory. Every entry under `tools` must carry a complete `meta` block.

### Required Fields

| Key | Type | Description |
|-----|------|-------------|
| `namespace` | string | Unique namespace, regex `^[a-z][a-z0-9-]*$` |
| `name` | string | Human-readable display name |
| `description` | string | Short summary of the API |
| `version` | string | Must equal `'4.0.0'` |
| `root` | string | Base URL for the API |
| `tools` | object | Map of tool definitions (may be empty for Skills-only schemas) |

### Required `meta` Fields per Tool

| Field | Type | Notes |
|-------|------|-------|
| `isReadOnly` | boolean | True for GET / read-only access |
| `isConcurrencySafe` | boolean | Defaults to `isReadOnly` |
| `isDestructive` | boolean | Defaults to `!isReadOnly` |
| `searchHint` | string | Short hint for tool search |
| `aliases` | string[] | Alternative tool names |
| `alwaysLoad` | boolean | Force-load even when filtered |

Use `MetaGenerator.generateForSchema({ tools })` to derive an initial `meta` block via heuristics.

### Example v4 Schema

```js
export const main = {
    namespace: 'etherscan',
    name: 'Etherscan',
    description: 'Etherscan REST API.',
    version: '4.0.0',
    docs: [ 'https://docs.etherscan.io' ],
    tags: [ 'evm', 'blockchain' ],
    root: 'https://api.etherscan.io',
    requiredServerParams: [ 'API_KEY' ],
    tools: {
        getBalance: {
            method: 'GET',
            path: '/api?module=account&action=balance',
            description: 'Return the balance for an address.',
            parameters: [],
            meta: {
                isReadOnly: true,
                isConcurrencySafe: true,
                isDestructive: false,
                searchHint: 'fetch ETH balance for an address',
                aliases: [],
                alwaysLoad: false
            },
            tests: [
                { _description: 'happy path' }
            ]
        }
    }
}

export const handlers = ( { sharedLists, libraries } ) => ( {
    getBalance: {
        postRequest: async ( { response } ) => {
            return { response: { balance: response[ 'result' ] } }
        }
    }
} )

// Skills, resources, and prompts are top-level exports — never nested in main
export const skills = {
    'lookup-balance': {
        version: 'flowmcp/4.0.0',
        type: 'namespace',
        whenToUse: 'When the user wants to lookup an ETH balance.',
        content: 'Use {{tool:etherscan/getBalance}} with the parameter address.'
    }
}
```

## Legacy API (v1 / v2)

The v1 and v2 APIs remain available for existing consumers:

```js
import { FlowMCP } from 'flowmcp-core/v2'    // v2 API
import { FlowMCP } from 'flowmcp-core/v1'    // v1 API (legacy)
import { FlowMCP } from 'flowmcp-core/legacy' // v1 API (legacy alias)
```

See [`MIGRATION.md`](./MIGRATION.md) for upgrade paths (v1 → v2 and v3 → v4). The v1 method-by-method reference (`.getArgvParameters`, `.filterArrayOfSchemas`, `.activateServerTools`, `.fetch`, etc.) is preserved in the Git history.


## Error Handling

The v4 Pipeline collects all errors and warnings in the result object — it never throws on validation failure. Inspect `status`, `messages`, and `warnings` to react.

```js
const result = await Pipeline.load( { filePath: './schemas/etherscan.mjs' } )

if( !result.status ) {
    result.messages
        .forEach( ( msg ) => { console.error( '- ' + msg ) } )
    return
}

result.warnings
    .forEach( ( w ) => { console.warn( '! ' + w ) } )
```

### Error categories

1. **SEC*** — SecurityScanner findings (forbidden patterns, imports, eval)
2. **VAL*** — MainValidator (schema shape, meta-block, version)
3. **SEL*** — SelectionLoader / SelectionValidator
4. **SKILL*** — SkillLoader / SkillValidator (incl. missing tool references)
5. **PIPE-WARN / PIPE-INFO** — non-fatal pipeline notices

## Testing & Validation

Run the v4 test suite from the repository root:

```bash
npm test
npm run test:coverage:src
```

Schema authors should pair each tool with a `tests` array carrying at least one `_description` entry. The v4 pipeline keeps test definitions in `main.tools[name].tests` — they are not removed during validation.

## Performance & Optimization

- The pipeline is async and runs independent steps concurrently where possible (selections, prefill, library loading).
- `SecurityScanner` and `SchemaLoader` use static analysis and dynamic import — no eval, no spawned processes.
- Heuristic helpers (`MetaGenerator.generateForSchema`, `OutputSchemaGenerator.generateFromResponse`) avoid recomputation by caching per-tool / per-response.
- The Skills-only Sonderpfad short-circuits the pipeline, keeping load times minimal for browser-automation schemas.

## Documentation

For additional documentation and examples:

- **[FlowMCP Specification v4.0.0](https://github.com/FlowMCP/flowmcp-spec)** — Complete specification (current)
- **[MIGRATION.md](./MIGRATION.md)** — Migration guides (v1 → v2 and v3 → v4)
- **[FILTERING.md](./FILTERING.md)** — Technical specification for `filterArrayOfSchemas()` (legacy v1 API)
- **tests/unit/v4/** — Reference test suite for the v4 pipeline and modules

## License

MIT