# FlowMCP

**FlowMCP** is a schema-based framework that bridges existing web APIs (e.g., REST or GraphQL) with AI systems. It standardizes interaction using a universal format called the **Model Context Protocol (MCP)**.

---

## ✨ Purpose

FlowMCP abstracts complex APIs into clean, structured schema definitions, enabling seamless AI-driven communication with external services. These schemas eliminate ambiguity and ensure compatibility through versioned contracts.

---

## 🔧 Core Features

* **Schema-Based Integration** – Each route is described in a structured schema that AI systems can interpret.
* **Modifier System** – Pre-, post-, and execute-phase handlers enable transformation and logic injection.
* **Inline Parameters with Zod Validation** – Parameters use inline formatting with built-in type enforcement.
* **Test Coverage** – Each route supports embedded test cases to verify real-world API interactions.
* **Text-Based Output** – Results are returned in clear, human-readable format.

---

## 📐 Schema Format

Each schema must export a single `const schema = {}` object from a `.mjs` file with the following keys:

| Key                    | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `namespace`            | Short unique name using only ASCII letters (`/^[a-zA-Z]+$/`)                |
| `name`                 | Human-readable display name                                                 |
| `description`          | Summary of schema functionality                                             |
| `docs`                 | List of reference documentation URLs                                        |
| `tags`                 | Array of activation tags (e.g., `group.route`, `group.!route`)              |
| `flowMCP`              | Version string (`"1.2.0"` or `"1.2.2"`)                                     |
| `root`                 | API root URL, can include variable placeholders                             |
| `requiredServerParams` | Environment variables used in headers, root, or parameters                  |
| `headers`              | Key-value HTTP headers with optional variable substitution (`{{...}}`)      |
| `routes`               | API route definitions                                                       |
| `handlers`             | Async modifier functions for preprocessing or response handling             |

---

## 🧭 Route Definition

Each route under `routes` must define:

* `requestMethod`: `"GET"` or `"POST"`
* `description`: Summary of the endpoint
* `route`: URL path with optional placeholders (e.g., `/item/:id`)
* `parameters`: Input list, defined inline
* `tests`: Array of input samples with `_description`
* `modifiers`: Required array with `phase` and `handlerName`. If not in use set to []

---

## 🧩 Parameter Format (1.2.2-compliant)

Each parameter entry must be **single-line**, following this exact layout:

```javascript
{ position: { key: "id", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["length(24)"] } }
````

### Accepted `z.primitive` values:

* `string()`
* `number()`
* `boolean()`
* `enum(...)`

### Accepted `z.options` values:

* `length(n)`
* `min(n)`, `max(n)`
* `regex(pattern)`
* `optional()`
* `default(value)`

> 🛑 **Multiline parameters are not valid** in version 1.2.2.

---

## 🧪 Test Cases

Each route should include:

```javascript
tests: [
    { _description: "Sample test", id: "abc123xyz456789def000000" }
]
```

* `_description` is required
* Only declared parameter keys are allowed
* All fields must match schema structure

---

## 🔁 Modifiers

Use modifiers for pre/post processing or custom execution:

```javascript
modifiers: [
    { phase: "pre", handlerName: "prepareQuery" },
    { phase: "post", handlerName: "transformOutput" },
    { phase: "execute", handlerName: "customFetcher" }
]
```

* Phases: `"pre"`, `"post"`, `"execute"`
* Each handler must exist in `handlers` block

---

## ⚙️ Handlers

Example handler definition:

```javascript
handlers: {
    normalizeResult: async ({ struct, payload }) => {
        if (!struct.data?.result) {
            struct.status = false;
            struct.messages.push("Missing result data");
        } else {
            struct.data = struct.data.result;
        }
        return { struct, payload };
    }
}
```

---

## 🧩 Activation & Server

Schemas are activated via FlowMCP server tools:

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { FlowMCP } from 'flowMCP'
import { schema } from './schema.mjs'

const server = new McpServer({
    name: 'Schema Tester',
    description: 'Local server for schema testing',
    version: '1.2.2'
})

FlowMCP.activateServerTools({
    server,
    schema,
    serverParams: { API_KEY: 'abc123' }
})

await server.connect(new StdioServerTransport())
```

---

## 🧪 FlowMCP Exposed API (index.mjs)

From the root module:

* `FlowMCP.activateServerTools(...)`
* `FlowMCP.getAllTests(...)`
* `FlowMCP.fetch(...)`
* `FlowMCP.validateSchema(...)`
* `FlowMCP.prepareActivations(...)`
* `FlowMCP.getArgvParameters(...)`

---

## 📎 Formatting Rules

* Always use **4-space indentation**
* Parameters and modifiers must be one-liners
* Leave **two blank lines** before `export { schema };`
* Declare constants (e.g. enums, helper mappings) above the schema

---

## 📚 Schema Library

Explore curated schemas on GitHub: [flowMCP/flowMCP-schemas](https://github.com/flowMCP/flowMCP-schemas)

This community-driven repository contains more than **60+ production-ready FlowMCP schemas** from major data providers like:

* `chainlink`
* `luksoNetwork`
* `coingecko`
* `poap`
* `solanatracker`
* `etherscan`, `dexscreener`, `moralis`, and more...

You can import any schema directly into your project as shown:

```js
import { schema } from './schemas/chainlink/getLatestPrices.mjs'
```

---

## ⚒️ Schema Generator Tool

Need a new schema? You can generate FlowMCP-compliant schemas automatically using the AI-based generator:

👉 [Open Schema Generator in ChatGPT](https://chatgpt.com/share/6839ea8b-b1a8-800a-a157-44c83ba77625)

Just describe the API behavior in plain English, and the tool will produce a valid `.mjs` schema file ready to use with FlowMCP.

---

## 📄 License & Contributions

Contributions are welcome via PRs. Follow the schema rules strictly and ensure your changes pass FlowMCP validation.

---

## 📌 Version

**This README is written for FlowMCP schema specification version `1.2.2`.**

```