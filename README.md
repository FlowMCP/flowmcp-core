# FlowMCP

**FlowMCP** is a framework designed to adapt and expose existing web APIs (e.g., REST interfaces) through a standardized Model Context Protocol (MCP) interface. It allows APIs to be consumed by AI systems in a structured, testable, and semantically consistent way.

---

## ✨ Purpose

FlowMCP abstracts complex APIs into structured, AI-friendly schema definitions. These definitions help streamline communication between external data sources and AI interfaces.

---

## 🔧 Core Features

* **Schema-Based Integration**: Each API route is described with a schema, including parameters optimized for AI understanding.
* **Modifiers (Pre/Post Processing)**: Adjust query execution or results for normalization and formatting.
* **Automated Testing**: Built-in test cases ensure routes function as expected.
* **Text-Based Output**: Results are returned as human-readable text with detailed error messages if needed.

---

## 📐 Schema Structure

Each schema is stored in a `.mjs` file with a `const schema = { ... }` declaration and contains the following keys:

| Key                    | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `namespace`            | Unique identifier (max 24 chars, alphanumeric only)              |
| `name`                 | Display name of the schema                                       |
| `description`          | Summary of what the schema provides                              |
| `docs`                 | List of API documentation URLs                                   |
| `tags`                 | Tags for logical grouping and filtering (standard or query tags) |
| `flowMCP`              | Compatible version (e.g., `"1.2.0"`)                             |
| `root`                 | Base URL of the API                                              |
| `requiredServerParams` | Environment variables required (e.g., API keys)                  |
| `headers`              | HTTP headers including variable placeholders                     |
| `routes`               | Route definitions                                                |
| `handlers`             | Async functions for route modifiers                              |

---

## 🔄 Route Definition

Each route defines an API call with parameters, descriptions, and optional modifiers:

* `requestMethod`: `"GET"` or `"POST"`
* `description`: Explains the route's purpose
* `route`: The path (e.g., `/account/:id`) with optional dynamic inserts
* `parameters`: Required and optional inputs
* `tests`: Predefined test cases
* `modifiers`: Optional functions to run in phases:

  * `"pre"`: Before the request is sent
  * `"post"`: After data is received
  * `"execute"`: Fully custom execution, overrides default request

---

## 🔍 Parameters

Parameters are defined with:

* `key`: Parameter name
* `value`: Static, environment (`{{ENV_VAR}}`), or user input (`{{USER_PARAM}}`)
* `location`: Where the parameter is used (`insert`, `query`, `body`)
* `z`: Input validation using [Zod](https://zod.dev) types

### Zod Primitives

* `string()`
* `number()`
* `boolean()`
* `enum(val1,val2,...)`

### Zod Options

* `min(n)`, `max(n)`, `length(n)`
* `optional()`, `default(value)`, `regex(r)`

---

## 🧪 Tests

Each route can include test cases for verification:

```js
tests: [
    { _description: "Basic pool stats test", token: "...", pool: "..." }
]
```

---

## ⚙️ Activating a Schema

Schemas can be activated using `FlowMCP.activateServerTools(...)`.

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { FlowMCP } from 'flowMCP'
import { schema } from './yourSchema.mjs'

const server = new McpServer({
    name: 'Test Server',
    description: 'Dev server for testing',
    version: '1.2.0'
})

const serverParams = {
    MY_API_KEY: 'your_api_key_here'
}

FlowMCP.activateServerTools({ server, schema, serverParams })

const transport = new StdioServerTransport()
await server.connect(transport)
```

---

## 🧩 Example: Simple API Call

```js
const schema = {
    namespace: "solanatracker",
    name: "TokenStatsAPI",
    ...
    routes: {
        tokenStatsByPool: {
            requestMethod: "GET",
            route: "/stats/:token/:pool",
            ...
        }
    },
    handlers: {}
}
export { schema }
```

---

## ⚡ Example: Modifier Handler

```js
handlers: {
    modifyQuery: async({ struct, payload, userParams, routeName, phaseType }) => {
        payload.url = payload.url.replace('--placeholder--', userParams.actualValue)
        return { struct, payload }
    }
}
```

---

## 📚 Additional Features (from `index.mjs`)

* `FlowMCP.activateServerTools(...)`: Activates schema tools for the server.
* `FlowMCP.getAllTests(...)`: Returns all defined tests.
* `FlowMCP.fetch(...)`: Manually fetch data from a specific route.
* `FlowMCP.validateSchema(...)`: Validates a schema definition.

---

## 📎 Formatting Guidelines

* 4-space indentation
* Arrays like `tests`, `parameters`, and `modifiers` should be one-liners per entry
* Schema exports should follow after two empty lines
* Any helper constants must be declared above `const schema`

---

## 📄 License & Contributions

FlowMCP is open for contributions. Feel free to open issues or submit PRs for enhancements, fixes, or new features.