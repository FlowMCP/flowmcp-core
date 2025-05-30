# 🌐 FlowMCP – Technical Standard (Version 1.2.2)

## 1. Purpose

**FlowMCP** provides a standardized, AI-friendly format for describing and interacting with existing APIs. Its goal is to enable automated integration of REST-like interfaces through clearly structured schemas that minimize ambiguity and maximize robustness.

---

## 2. Schema Structure

```javascript
const schema = {
    namespace: "exampleNamespace",
    name: "Example API",
    description: "Brief explanation of the API",
    docs: ["https://example.com/docs"],
    tags: ["production", "exampleapi.getObject"],
    flowMCP: "1.2.0",
    root: "https://api.example.com",
    requiredServerParams: ["API_KEY"],
    headers: { Authorization: "Bearer {{API_KEY}}" },
    routes: {},
    handlers: {}
};


export { schema };
```

---

## 3. General Validation Rules

| Field                  | Requirement                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `namespace`            | Must be non-empty string; letters only (`/^[a-zA-Z]+$/`)                                                     |
| `flowMCP`              | Must be in `"x.x.x"` format, e.g. `"1.2.0"`                                                                  |
| `root`                 | Must be a valid URL; placeholders like `{{API_KEY}}` are allowed                                             |
| `requiredServerParams` | Must include all placeholders used in `root`, `headers`, and `parameters.value` (excluding `{{USER_PARAM}}`) |
| `tags`                 | Format: `"module.route"` or `"module.!route"` using letters and dots only                                    |

---

## 4. Route Structure

```javascript
routes: {
    getExample: {
        requestMethod: "GET",
        description: "Example route",
        route: "/example/:id",
        parameters: [ /* see parameter formatting */ ],
        tests: [ /* see test rules */ ],
        modifiers: [ /* optional */ ]
    }
}
```

---

## 5. 📌 Parameter Formatting (Single Line)

**Each parameter must be written on a single line** to ensure readability and support for inline comments. This format is a strict convention in FlowMCP.

### ✅ **Correct:**

```javascript
parameters: [
    { position: { key: "id", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["length(24)"] } }
]
```

### ❌ **Incorrect:**

```javascript
parameters: [
    {
        position: {
            key: "id",
            value: "{{USER_PARAM}}",
            location: "insert"
        },
        z: {
            primitive: "string()",
            options: ["length(24)"]
        }
    }
]
```

> 🔹 Every parameter using `{{USER_PARAM}}` **must** include a valid `z` object with `primitive` and `options`.

---

## 6. Options for `z.options`

| Option       | Meaning                        |
| ------------ | ------------------------------ |
| `length(n)`  | Must be exactly `n` characters |
| `min(n)`     | Minimum numeric value          |
| `max(n)`     | Maximum numeric value          |
| `regex(x)`   | Must match regex pattern       |
| `optional()` | Parameter is optional          |
| `default(x)` | Default value if missing       |

---

## 7. Modifiers

```javascript
modifiers: [
    { phase: "pre", handlerName: "modifyInput" },
    { phase: "post", handlerName: "normalizeResult" }
]
```

* Valid `phase` values: `pre`, `execute`, `post`
* Each `handlerName` must match a function in the `handlers` block.

---

## 8. Handlers

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

## 9. Tests

```javascript
tests: [
    { _description: "Test with valid ID", id: "abc123def456ghi789xyz012" }
]
```

* Only valid field names (as per parameters) are allowed.
* `_description` is required.
* Unknown or undefined fields are not permitted.

---

## 10. Complete Example Schema

```javascript
const schema = {
    namespace: "exampleapi",
    name: "Example API",
    description: "Returns example data for a given object",
    docs: ["https://example.com/docs"],
    tags: ["production", "exampleapi.getObject"],
    flowMCP: "1.2.0",
    root: "https://api.example.com/v1",
    requiredServerParams: ["API_KEY"],
    headers: { Authorization: "Bearer {{API_KEY}}" },
    routes: {
        getObject: {
            requestMethod: "GET",
            description: "Retrieves an object by ID",
            route: "/objects/:id",
            parameters: [
                { position: { key: "id", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["length(24)"] } }
            ],
            tests: [
                { _description: "Test with ID", id: "1234567890abcdef12345678" }
            ],
            modifiers: [
                { phase: "post", handlerName: "normalizeObject" }
            ]
        }
    },
    handlers: {
        normalizeObject: async ({ struct, payload }) => {
            if (struct.data?.object) {
                struct.data = struct.data.object;
            } else {
                struct.status = false;
                struct.messages.push("Missing object data");
            }
            return { struct, payload };
        }
    }
};


export { schema };
```