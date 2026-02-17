# FlowMCP v1 (Frozen)

> **Status: Frozen.** No new features will be added to v1. Only critical security fixes.

v1 is the original FlowMCP implementation supporting schema version 1.2.x.

## Import

```javascript
import { FlowMCP, Validation } from 'flowmcp-core/legacy'
// or
import { FlowMCP, Validation } from 'flowmcp-core/v1'
```

## Public Methods

| Method | Description |
|--------|-------------|
| `getArgvParameters()` | Parse CLI arguments |
| `prepareActivations()` | Prepare schema activations with env vars (deprecated) |
| `filterArrayOfSchemas()` | Filter schemas by namespace/tags/routes |
| `activateServerTools()` | Bulk register MCP tools from schema |
| `activateServerTool()` | Register single MCP tool |
| `prepareServerTool()` | Prepare tool config without registering |
| `getZodInterfaces()` | Generate Zod schemas from routes |
| `getAllTests()` | Extract test cases from schema |
| `validateSchema()` | Validate schema structure |
| `fetch()` | Execute HTTP request |

## Migration

See [MIGRATION.md](../../MIGRATION.md) for the v1 to v2 migration guide.
