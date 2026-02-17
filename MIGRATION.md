# Migration Guide: v1 to v2

## Overview

FlowMCP Core v2 implements the FlowMCP Specification 2.0.0 with a new Two-Export schema format, security scanning, shared lists, and factory-injected handlers.

v1 continues to work via `flowmcp-core/legacy` or `flowmcp-core/v1`.

## Import Changes

### Before (v1)

```javascript
import { FlowMCP } from 'flowmcp-core'
```

### After (v2)

```javascript
import { FlowMCP } from 'flowmcp-core/v2'
```

### Backward Compatible

```javascript
// Still works - re-exports v1
import { FlowMCP } from 'flowmcp-core'
import { FlowMCP } from 'flowmcp-core/legacy'
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
