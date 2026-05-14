# Migration Guide: v1 to v2

## Overview

FlowMCP Core v2 implements the FlowMCP Specification 2.0.0 with a new Two-Export schema format, security scanning, shared lists, and factory-injected handlers.

v1 continues to work via `flowmcp-core/legacy` or `flowmcp-core/v1`.

## Import Changes

### Default (v2)

```javascript
import { FlowMCP } from 'flowmcp-core'
```

### Explicit Version

```javascript
import { FlowMCP } from 'flowmcp-core/v2'    // same as default
import { FlowMCP } from 'flowmcp-core/v1'    // legacy v1 API
import { FlowMCP } from 'flowmcp-core/legacy' // legacy v1 API
```

## Schema Format

### Before (v1.2.x)

```javascript
export const schema = {
    flowMCP: '1.2.0',
    namespace: 'etherscan',
    name: 'Etherscan',
    description: 'Etherscan API',
    root: 'https://api.etherscan.io',
    requiredServerParams: [ 'API_KEY' ],
    headers: { 'Content-Type': 'application/json' },
    routes: {
        getBalance: {
            requestMethod: 'GET',
            route: '/api?module=account&action=balance',
            description: 'Get balance.',
            parameters: [ /* ... */ ],
            modifiers: [
                { phase: 'post', handlerName: 'transformBalance' }
            ],
            tests: [ /* ... */ ]
        }
    },
    handlers: {
        transformBalance: ( { struct, payload, userParams, routeName, phaseType } ) => {
            struct['data'] = { balance: struct['data']['result'] }
            return { struct, payload }
        }
    }
}
```

### After (v2.0.0)

```javascript
export const main = {
    namespace: 'etherscan',
    name: 'Etherscan',
    description: 'Etherscan API',
    version: '2.0.0',
    root: 'https://api.etherscan.io',
    requiredServerParams: [ 'API_KEY' ],
    headers: { 'Content-Type': 'application/json' },
    routes: {
        getBalance: {
            method: 'GET',
            path: '/api?module=account&action=balance',
            description: 'Get balance.',
            parameters: [ /* ... */ ]
        }
    }
}

export const handlers = ( { sharedLists, libraries } ) => ( {
    getBalance: {
        postRequest: async ( { response, struct, payload } ) => {
            return { response: { balance: response['result'] } }
        }
    }
} )
```

## Key Differences

| Aspect | v1 | v2 |
|--------|----|----|
| Export | `export const schema` | `export const main` + `export const handlers` |
| Version field | `flowMCP: '1.2.0'` | `version: '2.0.0'` |
| Route method | `requestMethod` | `method` |
| Route path | `route` | `path` |
| Modifiers | Array with phase/handlerName | Factory function returning handler objects |
| Handler signature | `( { struct, payload, userParams, routeName, phaseType } )` | `preRequest` / `executeRequest` / `postRequest` |
| Execute phase | `modifiers: [{ phase: 'execute', handlerName }]` | `executeRequest( { struct, payload } )` in handler factory |
| Handlers location | `schema.handlers` (object of functions) | Top-level `export const handlers` (factory) |
| Security | None | Static scan for forbidden patterns |
| Shared Lists | Not supported | `main.sharedLists` + factory injection |
| Library loading | Not supported | `main.requiredLibraries` + allowlist |
| Import statements | Allowed | Forbidden (SEC001) |

## Handler Signature Changes

### Before (v1)

```javascript
// Single function for all phases
( { struct, payload, userParams, routeName, phaseType } ) => {
    // struct.data contains response in post phase
    struct['data'] = transformedData
    return { struct, payload }
}
```

### After (v2)

```javascript
// Separate functions per phase
{
    preRequest: async ( { struct, payload } ) => {
        // struct = { url, method, headers, body }
        return { struct, payload }
    },
    executeRequest: async ( { struct, payload } ) => {
        // Replaces standard HTTP fetch entirely
        // payload includes: url, method, headers, body, userParams, serverParams
        // Use for: RPC calls, smart contract interactions, custom protocols
        return { response: customData }
    },
    postRequest: async ( { response, struct, payload } ) => {
        // response = parsed JSON (from fetch or executeRequest)
        return { response: transformedResponse }
    }
}
```

**Note:** v1 `phase: 'execute'` maps to v2 `executeRequest`. When `executeRequest` is present, the standard HTTP fetch is skipped.

## Consumer Integration

### Before (v1)

```javascript
import { FlowMCP } from 'flowmcp-core'

FlowMCP.validateSchema( { schema } )

const struct = await FlowMCP.fetch( {
    schema,
    userParams: { address: '0x...' },
    serverParams: { API_KEY: '...' },
    routeName: 'getBalance'
} )
```

### After (v2)

```javascript
import { FlowMCP } from 'flowmcp-core/v2'

const { status, main, handlerMap } = await FlowMCP.loadSchema( {
    filePath: './schemas/etherscan.mjs',
    listsDir: './lists'
} )

const struct = await FlowMCP.fetch( {
    main,
    handlerMap,
    userParams: { address: '0x...' },
    serverParams: { API_KEY: '...' },
    routeName: 'getBalance'
} )
```

## Automatic Legacy Support

v2 Core automatically detects and converts v1.2.x schemas at load time:

```javascript
const result = await FlowMCP.loadSchema( {
    filePath: './old-v1-schema.mjs'
} )

// result.warnings will include:
// "LegacyAdapter: Schema uses v1.x format, automatic conversion applied"
```

No code changes needed for v1 schemas. They will work but with limitations:
- No shared list references
- No output schema validation
- No library injection
- Deprecation warning emitted

## Migration Checklist

- [ ] Wrap schema in `export const main = { ... }` with `version: '2.0.0'`
- [ ] Rename `flowMCP` field to `version`
- [ ] Rename `requestMethod` to `method` in routes
- [ ] Rename `route` to `path` in routes
- [ ] Convert `modifiers` + `handlers` to factory `export const handlers`
- [ ] Update handler signatures to `preRequest`/`postRequest`
- [ ] Remove all `import` statements from schema files
- [ ] Add `output` schemas (optional but recommended)
- [ ] Add `sharedLists` references where applicable
- [ ] Update consumer code to use `FlowMCP.loadSchema()` + `FlowMCP.fetch()`

---

# Migration Guide: v3 to v4

## Overview

FlowMCP Core v4 implements the FlowMCP Specification 4.0.0. v4 is shipped as the named export `flowmcp-core/v4` while v2 stays the default. The pipeline introduces selections, grade reporting, placeholder resolution, capture-flow output schemas, and a mandatory `meta` block per tool.

## Breaking Changes

- `main.skills` is **forbidden** — skills are top-level primitives. Use `main.tools` (with tool definitions) and a separate top-level `skills` export.
- A `meta` block per tool is **mandatory**. It has six required fields: `isReadOnly`, `isConcurrencySafe`, `isDestructive`, `searchHint`, `aliases`, `alwaysLoad`.
- `main.version` must be `'4.0.0'` (was `'3.0.0'`).
- Every skill must declare `whenToUse`, `type`, and `version: 'flowmcp/4.0.0'`.
- Namespace regex relaxed to `^[a-z][a-z0-9-]*$` (was `^[a-z]+$`).

## Import Paths

```javascript
// v4 (new) — Pipeline and supporting classes
import * as v4 from 'flowmcp-core/v4'

// Tree-shakable imports
import { Pipeline, GradeReporter, MetaGenerator } from 'flowmcp-core/v4'

// v2 (default) — unchanged
import * as v2 from 'flowmcp-core/v2'
import { FlowMCP } from 'flowmcp-core/v2'
```

## Schema Format

### Before (v3)

```javascript
export const main = {
    namespace: 'etherscan',
    name: 'Etherscan',
    description: 'Etherscan API',
    version: '3.0.0',
    root: 'https://api.etherscan.io',
    tools: {
        getBalance: {
            method: 'GET',
            path: '/api?module=account&action=balance',
            description: 'Get balance.',
            parameters: []
        }
    },
    skills: {
        // Nested skills — REMOVED in v4
        'lookup-balance': {
            content: 'Use {{tool:etherscan/getBalance}}.'
        }
    }
}
```

### After (v4)

```javascript
export const main = {
    namespace: 'etherscan',
    name: 'Etherscan',
    description: 'Etherscan API',
    version: '4.0.0',
    root: 'https://api.etherscan.io',
    tools: {
        getBalance: {
            method: 'GET',
            path: '/api?module=account&action=balance',
            description: 'Get balance.',
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

// Skills are a top-level export — never nested in main
export const skills = {
    'lookup-balance': {
        version: 'flowmcp/4.0.0',
        type: 'namespace',
        whenToUse: 'When the user wants to lookup an ETH balance.',
        content: 'Use {{tool:etherscan/getBalance}}.'
    }
}
```

## Required `meta` Fields per Tool

| Field | Type | Heuristic Default |
|-------|------|-------------------|
| `isReadOnly` | boolean | `method === 'GET'` |
| `isConcurrencySafe` | boolean | Defaults to `isReadOnly` |
| `isDestructive` | boolean | Defaults to `!isReadOnly` |
| `searchHint` | string | First ~100 chars from `description` + tags |
| `aliases` | string[] | Empty array |
| `alwaysLoad` | boolean | `false` |

### Migration Helper

```javascript
import { MetaGenerator } from 'flowmcp-core/v4'

const { tools: toolsWithMeta } = MetaGenerator
    .generateForSchema( { tools: main.tools } )

main.tools = toolsWithMeta
```

`MetaGenerator.generateForSchema({ tools })` walks each tool, infers the six fields via heuristics, and returns a new tools object with `meta` blocks filled in. Inspect the result and override any value that does not match your API semantics before committing the schema.

## Consumer Integration

### Before (v3)

```javascript
import { FlowMCP } from 'flowmcp-core'

const { status, main, handlerMap } = await FlowMCP.loadSchema( {
    filePath: './schemas/etherscan.mjs'
} )
```

### After (v4)

```javascript
import { Pipeline } from 'flowmcp-core/v4'

const result = await Pipeline
    .load( {
        filePath: './schemas/etherscan.mjs',
        listsDir: './schemas/shared/lists',
        allowlist: null,
        selectionFiles: [],
        prefillTimeout: 1000,
        fetchFn: null,
        userParams: {}
    } )

if( !result.status ) {
    console.error( 'Pipeline failed:', result.messages )
}

// result fields: main, handlerMap, resourceHandlerMap, sharedLists,
// libraries, skills, selections, prompts, contentMap, prefillResults, warnings
```

## Skills-only Schemas (kba, handelsregister, etsi-ipr)

Schemas with `tools: {}` that relied on `main.skills` for browser automation have been migrated to **CLI-Skills** (Option A — outside the Core pipeline). They are no longer processed by the v4 Core pipeline. See Memo 028 (Schema Migration) for repository-level details.

## Migration Checklist

- [ ] Bump `main.version` from `'3.0.0'` to `'4.0.0'`
- [ ] Move `main.skills` out of `main` into a top-level `export const skills`
- [ ] Add `version: 'flowmcp/4.0.0'`, `type`, and `whenToUse` to each skill
- [ ] Add a `meta` block (6 fields) to every entry under `main.tools`
- [ ] Optional: run `MetaGenerator.generateForSchema({ tools })` to bootstrap the meta blocks
- [ ] Switch imports from `flowmcp-core` to `flowmcp-core/v4` for the new pipeline
- [ ] Replace `FlowMCP.loadSchema()` calls with `Pipeline.load()` and inspect the result object
- [ ] Verify the pipeline run with `npm test` against your fixtures
