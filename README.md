[![Test](https://img.shields.io/github/actions/workflow/status/flowmcp/flowmcp/test-on-release.yml)]() ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# FlowMCP Core

A comprehensive framework for adapting existing web APIs into a standardized Model Context Protocol (MCP) interface, enabling structured, testable, and semantically consistent access for AI systems. FlowMCP Core transforms any REST API into MCP-compatible tools with built-in validation, testing, and error handling.

## Features

- **Universal API Adaptation**: Convert any REST API into MCP-compatible tools with minimal configuration
- **Schema-Driven Development**: Structured schema definitions with automatic validation and interface generation
- **Advanced Filtering System**: Sophisticated namespace, tag, and route filtering with case-insensitive matching
- **Built-in Testing Framework**: Comprehensive test generation and execution for all API endpoints
- **Native HTTP Client**: Modern fetch-based HTTP client with intelligent error handling
- **Zod Integration**: Automatic TypeScript/Zod interface generation from schemas
- **Server Tool Generation**: Automatic MCP server tool creation and activation
- **Command Line Interface**: Full CLI support with argument parsing and configuration
- **Comprehensive Validation**: Multi-layer validation for schemas, parameters, and responses
- **Performance Optimized**: Efficient filtering, caching, and resource management

## Table of Contents

- [FlowMCP Core](#flowmcp-core)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
  - [Methods](#methods)
    - [.getArgvParameters()](#getargvparameters)
    - [.filterArrayOfSchemas()](#filterarrayofschemas)
    - [.activateServerTools()](#activateservertools)
    - [.activateServerTool()](#activateservertool)
    - [.prepareServerTool()](#prepareservertool)
    - [.getZodInterfaces()](#getzodinterfaces)
    - [.getAllTests()](#getalltests)
    - [.validateSchema()](#validateschema)
    - [.fetch()](#fetch)
    - [.prepareActivations()](#prepareactivations)
  - [Schema Structure](#schema-structure)
  - [Error Handling](#error-handling)
  - [Testing & Validation](#testing--validation)
  - [Performance & Optimization](#performance--optimization)
  - [Documentation](#documentation)

## Quick Start

```js
import { FlowMCP } from './src/index.mjs'

// Basic schema definition
const schema = {
    namespace: 'cryptocompare',
    root: 'https://api.cryptocompare.com',
    headers: {
        'User-Agent': 'FlowMCP/1.3.0'
    },
    tags: ['crypto', 'price'],
    routes: {
        getCurrentPrice: {
            requestMethod: 'GET',
            route: '/data/price?fsym={{USER_PARAM}}&tsyms={{USER_PARAM}}',
            parameters: [
                {
                    position: { location: 'query', key: 'fsym', value: '{{USER_PARAM}}' },
                    z: 'string()'
                },
                {
                    position: { location: 'query', key: 'tsyms', value: '{{USER_PARAM}}' },
                    z: 'string()'
                }
            ],
            modifiers: []
        }
    }
}

// Validate schema structure
const validation = FlowMCP.validateSchema({ schema })
if (!validation.status) {
    console.error('Schema validation failed:', validation.messages)
    process.exit(1)
}

// Execute API request
const userParams = { fsym: 'BTC', tsyms: 'USD' }
const serverParams = {}
const result = await FlowMCP.fetch({ 
    schema, 
    userParams, 
    serverParams, 
    routeName: 'getCurrentPrice' 
})

if (result.status) {
    console.log('Bitcoin price:', result.dataAsString)
} else {
    console.error('API request failed:', result.messages)
}

// Generate test cases
const tests = FlowMCP.getAllTests({ schema })
console.log('Available tests:', tests.length)

// Create Zod interfaces
const zodInterfaces = FlowMCP.getZodInterfaces({ schema })
console.log('Generated interfaces:', Object.keys(zodInterfaces))
```

## Methods

### .getArgvParameters()

Parses command line arguments into structured configuration for schema filtering and processing.

**Method**

```js
FlowMCP.getArgvParameters({ argv, includeNamespaces = [], excludeNamespaces = [], activateTags = [] })
```

| Key                | Type    | Default | Description                                          | Required |
|--------------------|---------|---------|------------------------------------------------------|----------|
| `argv`             | array   |         | Process arguments array (typically `process.argv`)   | Yes      |
| `includeNamespaces`| array   | `[]`    | Default namespaces to include                        | No       |
| `excludeNamespaces`| array   | `[]`    | Default namespaces to exclude                        | No       |
| `activateTags`     | array   | `[]`    | Default tags to activate                             | No       |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

// Command line: node script.mjs --source=api --includeNamespaces=crypto,finance --activateTags=price
const config = FlowMCP.getArgvParameters({
    argv: process.argv,
    includeNamespaces: ['default'],
    excludeNamespaces: [],
    activateTags: []
})

console.log('Parsed configuration:', config)
```

**Returns**

```js
{
    source: 'api',
    includeNamespaces: ['crypto', 'finance'],
    excludeNamespaces: [],
    activateTags: ['price']
}
```

### .filterArrayOfSchemas()

Advanced filtering system for schema arrays with namespace, tag, and route-level filtering capabilities. Supports case-insensitive matching and comprehensive error collection.

**Method**

```js
FlowMCP.filterArrayOfSchemas({ arrayOfSchemas, includeNamespaces, excludeNamespaces, activateTags })
```

| Key                | Type    | Default | Description                                                           | Required |
|--------------------|---------|---------|-----------------------------------------------------------------------|----------|
| `arrayOfSchemas`   | array   |         | Array of schema objects to filter                                    | Yes      |
| `includeNamespaces`| array   |         | Namespaces to include (takes precedence over exclude)                | Yes      |
| `excludeNamespaces`| array   |         | Namespaces to exclude (ignored if include is specified)              | Yes      |
| `activateTags`     | array   |         | Mixed array of tags and route filters (`tag` or `namespace.route`)   | Yes      |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

const schemas = [
    { namespace: 'cryptocompare', tags: ['crypto', 'price'], routes: { getPrice: {}, getHistory: {} } },
    { namespace: 'coingecko', tags: ['crypto', 'market'], routes: { getCoins: {}, getMarkets: {} } },
    { namespace: 'newsapi', tags: ['news'], routes: { getNews: {}, getSources: {} } }
]

const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas({
    arrayOfSchemas: schemas,
    includeNamespaces: ['cryptocompare', 'coingecko'],
    excludeNamespaces: [],
    activateTags: [
        'crypto',                           // Include schemas with 'crypto' tag
        'cryptocompare.getPrice',           // Include only getPrice from cryptocompare
        'coingecko.!getMarkets'            // Exclude getMarkets from coingecko
    ]
})

console.log('Filtered schemas:', filteredArrayOfSchemas.length)
```

**Returns**

```js
{
    filteredArrayOfSchemas: [
        {
            namespace: 'cryptocompare',
            tags: ['crypto', 'price'],
            routes: { getPrice: {} }  // Only getPrice route included
        },
        {
            namespace: 'coingecko', 
            tags: ['crypto', 'market'],
            routes: { getCoins: {} }  // getMarkets excluded
        }
    ]
}
```

### .activateServerTools()

Bulk activation of MCP server tools from a schema definition. Automatically generates and registers all routes as server tools with proper validation and error handling.

**Method**

```js
FlowMCP.activateServerTools({ server, schema, serverParams, validate = true, silent = true })
```

| Key            | Type     | Default | Description                                          | Required |
|----------------|----------|---------|------------------------------------------------------|----------|
| `server`       | object   |         | MCP Server instance to register tools with          | Yes      |
| `schema`       | object   |         | Schema definition containing routes                  | Yes      |
| `serverParams` | object   |         | Server-specific parameters for API authentication   | Yes      |
| `validate`     | boolean  | `true`  | Enable input validation before activation           | No       |
| `silent`       | boolean  | `true`  | Suppress console output during activation           | No       |

**Example**

```js
import { FlowMCP } from './src/index.mjs'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'

const server = new Server({
    name: 'crypto-api-server',
    version: '1.0.0'
}, {
    capabilities: { tools: {} }
})

const schema = {
    namespace: 'cryptocompare',
    root: 'https://api.cryptocompare.com',
    routes: {
        getCurrentPrice: { /* route definition */ },
        getHistoricalData: { /* route definition */ },
        getExchangeList: { /* route definition */ }
    }
}

const serverParams = {
    apiKey: process.env.CRYPTOCOMPARE_API_KEY
}

const { mcpTools } = FlowMCP.activateServerTools({
    server,
    schema,
    serverParams,
    validate: true,
    silent: false
})

console.log('Activated tools:', Object.keys(mcpTools))
// Output: ['cryptocompare__getCurrentPrice', 'cryptocompare__getHistoricalData', 'cryptocompare__getExchangeList']
```

**Returns**

```js
{
    mcpTools: {
        'cryptocompare__getCurrentPrice': MCPTool,
        'cryptocompare__getHistoricalData': MCPTool,
        'cryptocompare__getExchangeList': MCPTool
    }
}
```

### .activateServerTool()

Activates a single MCP server tool from a specific schema route. Provides granular control over individual tool registration.

**Method**

```js
FlowMCP.activateServerTool({ server, schema, routeName, serverParams, validate = true })
```

| Key            | Type     | Default | Description                                        | Required |
|----------------|----------|---------|----------------------------------------------------|----------|
| `server`       | object   |         | MCP Server instance to register tool with         | Yes      |
| `schema`       | object   |         | Schema definition containing the route             | Yes      |
| `routeName`    | string   |         | Name of the specific route to activate             | Yes      |
| `serverParams` | object   |         | Server-specific parameters for API authentication | Yes      |
| `validate`     | boolean  | `true`  | Enable input validation before activation         | No       |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

const { toolName, mcpTool } = FlowMCP.activateServerTool({
    server,
    schema,
    routeName: 'getCurrentPrice',
    serverParams: { apiKey: 'your-api-key' },
    validate: true
})

console.log('Activated tool:', toolName)
// Output: 'cryptocompare__getCurrentPrice'
```

**Returns**

```js
{
    toolName: 'cryptocompare__getCurrentPrice',
    mcpTool: MCPToolInstance
}
```

### .prepareServerTool()

Prepares server tool configuration without activating it. Useful for testing, inspection, or custom tool registration workflows.

**Method**

```js
FlowMCP.prepareServerTool({ schema, serverParams, routeName, validate = true })
```

| Key            | Type     | Default | Description                                        | Required |
|----------------|----------|---------|----------------------------------------------------|----------|
| `schema`       | object   |         | Schema definition containing the route             | Yes      |
| `serverParams` | object   |         | Server-specific parameters for API authentication | Yes      |
| `routeName`    | string   |         | Name of the specific route to prepare              | Yes      |
| `validate`     | boolean  | `true`  | Enable input validation before preparation        | No       |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

const toolConfig = FlowMCP.prepareServerTool({
    schema,
    serverParams: { apiKey: 'your-api-key' },
    routeName: 'getCurrentPrice',
    validate: true
})

console.log('Tool name:', toolConfig.toolName)
console.log('Description:', toolConfig.description)
console.log('Zod schema:', toolConfig.zod)
// Function is ready to use: await toolConfig.func({ fsym: 'BTC', tsyms: 'USD' })
```

**Returns**

```js
{
    toolName: 'cryptocompare__getCurrentPrice',
    description: 'Get current price data from CryptoCompare API',
    zod: ZodSchema,
    func: async (userParams) => {
        // Configured function ready for execution
        return { content: [{ type: "text", text: "Result: {...}" }] }
    }
}
```

### .getZodInterfaces()

Generates TypeScript-compatible Zod validation schemas from FlowMCP schema definitions. Enables type-safe integration and validation.

**Method**

```js
FlowMCP.getZodInterfaces({ schema })
```

| Key      | Type   | Default | Description                              | Required |
|----------|--------|---------|------------------------------------------|----------|
| `schema` | object |         | Schema definition to generate types for | Yes      |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

const schema = {
    namespace: 'cryptocompare',
    routes: {
        getCurrentPrice: {
            parameters: [
                { position: { key: 'fsym' }, z: 'string()' },
                { position: { key: 'tsyms' }, z: 'string()' }
            ]
        },
        getHistoricalData: {
            parameters: [
                { position: { key: 'fsym' }, z: 'string()' },
                { position: { key: 'tsym' }, z: 'string()' },
                { position: { key: 'limit' }, z: 'number().optional()' }
            ]
        }
    }
}

const zodInterfaces = FlowMCP.getZodInterfaces({ schema })

console.log('Available interfaces:', Object.keys(zodInterfaces))
// Output: ['getCurrentPrice', 'getHistoricalData']

// Use the generated Zod schemas for validation
const result = zodInterfaces.getCurrentPrice.parse({ fsym: 'BTC', tsyms: 'USD' })
```

**Returns**

```js
{
    getCurrentPrice: z.object({
        fsym: z.string(),
        tsyms: z.string()
    }),
    getHistoricalData: z.object({
        fsym: z.string(),
        tsym: z.string(), 
        limit: z.number().optional()
    })
}
```

### .getAllTests()

Extracts comprehensive test cases from schema definitions. Automatically generates test scenarios for all routes with proper parameter combinations.

**Method**

```js
FlowMCP.getAllTests({ schema })
```

| Key      | Type   | Default | Description                                | Required |
|----------|--------|---------|--------------------------------------------|----------|
| `schema` | object |         | Schema definition to generate tests from  | Yes      |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

const schema = {
    namespace: 'cryptocompare',
    routes: {
        getCurrentPrice: {
            parameters: [
                { position: { key: 'fsym' }, z: 'string()', test: 'BTC' },
                { position: { key: 'tsyms' }, z: 'string()', test: 'USD,EUR' }
            ]
        },
        getExchangeList: {
            parameters: []
        }
    }
}

const tests = FlowMCP.getAllTests({ schema })

console.log('Generated tests:', tests.length)
tests.forEach(test => {
    console.log(`${test.routeName}:`, test.userParams)
})

// Execute all tests
for (const test of tests) {
    const result = await FlowMCP.fetch({
        schema,
        userParams: test.userParams,
        serverParams: {},
        routeName: test.routeName
    })
    
    console.log(`${test.routeName}: ${result.status ? 'PASS' : 'FAIL'}`)
}
```

**Returns**

```js
[
    {
        routeName: 'getCurrentPrice',
        userParams: { fsym: 'BTC', tsyms: 'USD,EUR' }
    },
    {
        routeName: 'getExchangeList', 
        userParams: {}
    }
]
```

### .validateSchema()

Comprehensive validation of FlowMCP schema structure. Checks for required fields, proper formatting, parameter consistency, and route definitions.

**Method**

```js
FlowMCP.validateSchema({ schema })
```

| Key      | Type   | Default | Description                      | Required |
|----------|--------|---------|----------------------------------|----------|
| `schema` | object |         | Schema definition to validate    | Yes      |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

const schema = {
    namespace: 'cryptocompare',
    root: 'https://api.cryptocompare.com',
    headers: {
        'User-Agent': 'FlowMCP/1.3.0'
    },
    tags: ['crypto', 'price'],
    routes: {
        getCurrentPrice: {
            requestMethod: 'GET',
            route: '/data/price',
            parameters: [
                { position: { location: 'query', key: 'fsym', value: '{{USER_PARAM}}' }, z: 'string()' }
            ],
            modifiers: []
        }
    }
}

const validation = FlowMCP.validateSchema({ schema })

if (validation.status) {
    console.log('Schema is valid!')
} else {
    console.error('Schema validation failed:')
    validation.messages.forEach(msg => console.error(`- ${msg}`))
}
```

**Returns**

```js
{
    status: true,  // or false if validation fails
    messages: []   // Array of error messages if validation fails
}
```

### .fetch()

Executes HTTP requests based on schema definitions with comprehensive parameter validation, error handling, and response processing. Uses modern fetch API with intelligent error recovery.

**Method**

```js
async FlowMCP.fetch({ schema, userParams, serverParams, routeName })
```

| Key            | Type   | Default | Description                                        | Required |
|----------------|--------|---------|----------------------------------------------------|----------|
| `schema`       | object |         | Schema definition containing route configuration   | Yes      |
| `userParams`   | object |         | User-provided parameters for the API call         | Yes      |
| `serverParams` | object |         | Server-specific parameters (API keys, etc.)       | Yes      |
| `routeName`    | string |         | Name of the route to execute                       | Yes      |

**Example**

```js
import { FlowMCP } from './src/index.mjs'

const schema = {
    namespace: 'cryptocompare',
    root: 'https://api.cryptocompare.com',
    headers: {
        'Authorization': 'Bearer {{apiKey}}'
    },
    routes: {
        getCurrentPrice: {
            requestMethod: 'GET',
            route: '/data/price?fsym={{USER_PARAM}}&tsyms={{USER_PARAM}}',
            parameters: [
                { position: { location: 'query', key: 'fsym', value: '{{USER_PARAM}}' }, z: 'string()' },
                { position: { location: 'query', key: 'tsyms', value: '{{USER_PARAM}}' }, z: 'string()' }
            ],
            modifiers: []
        }
    }
}

try {
    const result = await FlowMCP.fetch({
        schema,
        userParams: { fsym: 'BTC', tsyms: 'USD,EUR' },
        serverParams: { apiKey: 'your-api-key' },
        routeName: 'getCurrentPrice'
    })

    if (result.status) {
        console.log('API Response:', result.dataAsString)
        console.log('Parsed Data:', result.data)
    } else {
        console.error('API Error:', result.messages)
    }
} catch (error) {
    console.error('Fetch failed:', error.message)
}
```

**Returns**

```js
{
    status: true,  // or false if request failed
    messages: [],  // Array of error messages if status is false
    data: {        // Parsed response data (null if failed)
        "BTC": {
            "USD": 45000,
            "EUR": 38000
        }
    },
    dataAsString: '{"BTC":{"USD":45000,"EUR":38000}}'  // String representation
}
```

### .prepareActivations()

**⚠️ Deprecated Method** - Use `.filterArrayOfSchemas()` instead. Prepares schema activations with environment variables for legacy compatibility.

**Method**

```js
FlowMCP.prepareActivations({ arrayOfSchemas, envObject, activateTags, includeNamespaces, excludeNamespaces })
```

| Key                | Type   | Description                                     | Required |
|--------------------|--------|-------------------------------------------------|----------|
| `arrayOfSchemas`   | array  | Array of schema objects                         | Yes      |
| `envObject`        | object | Environment variables and server parameters     | Yes      |
| `activateTags`     | array  | Tags for filtering (deprecated)                 | Yes      |
| `includeNamespaces`| array  | Namespaces to include (deprecated)              | Yes      |
| `excludeNamespaces`| array  | Namespaces to exclude (deprecated)              | Yes      |

**Example**

```js
// Deprecated - use filterArrayOfSchemas instead
const { activationPayloads } = FlowMCP.prepareActivations({
    arrayOfSchemas: schemas,
    envObject: process.env,
    activateTags: ['crypto'],
    includeNamespaces: [],
    excludeNamespaces: []
})
```

**Returns**

```js
{
    activationPayloads: [/* prepared activation data */]
}
```

## Schema Structure

FlowMCP schemas define the complete structure for API integration with comprehensive validation and tool generation capabilities.

### Basic Schema Structure

| Key          | Type       | Default | Description                                                    | Required |
|--------------|------------|---------|----------------------------------------------------------------|----------|
| `namespace`  | string     |         | Unique identifier for the API schema                          | Yes      |
| `root`       | string     |         | Base URL for the API (e.g., `https://api.example.com`)        | Yes      |
| `headers`    | object     | `{}`    | Default headers for all requests                               | No       |
| `tags`       | array      | `[]`    | Tags for categorization and filtering                          | No       |
| `routes`     | object     |         | Route definitions for API endpoints                            | Yes      |

### Route Structure

| Key            | Type   | Default | Description                                           | Required |
|----------------|--------|---------|-------------------------------------------------------|----------|
| `requestMethod`| string |         | HTTP method (`GET`, `POST`, `PUT`, `DELETE`)          | Yes      |
| `route`        | string |         | API endpoint path with parameter placeholders         | Yes      |
| `parameters`   | array  |         | Parameter definitions for validation and processing   | Yes      |
| `modifiers`    | array  | `[]`    | Pre/post processing hooks                             | No       |

### Parameter Structure

| Key        | Type   | Default | Description                                          | Required |
|------------|--------|---------|------------------------------------------------------|----------|
| `position` | object |         | Parameter location and mapping configuration         | Yes      |
| `z`        | string |         | Zod validation schema as string                      | Yes      |
| `test`     | any    |         | Default test value for test generation              | No       |

### Position Structure

| Key        | Type   | Default | Description                                              | Required |
|------------|--------|---------|----------------------------------------------------------|----------|
| `location` | string |         | Parameter location (`query`, `body`, `header`, `insert`)| Yes      |
| `key`      | string |         | Parameter name in the API                               | Yes      |
| `value`    | string |         | Value template (`{{USER_PARAM}}`, `{{serverParam}}`)    | Yes      |

### Example Complete Schema

```js
const schema = {
    namespace: 'cryptocompare',
    root: 'https://min-api.cryptocompare.com',
    headers: {
        'User-Agent': 'FlowMCP/1.3.0',
        'Authorization': 'Bearer {{apiKey}}'
    },
    tags: ['crypto', 'price', 'market'],
    routes: {
        getCurrentPrice: {
            requestMethod: 'GET',
            route: '/data/price?fsym={{USER_PARAM}}&tsyms={{USER_PARAM}}',
            parameters: [
                {
                    position: { location: 'query', key: 'fsym', value: '{{USER_PARAM}}' },
                    z: 'string()',
                    test: 'BTC'
                },
                {
                    position: { location: 'query', key: 'tsyms', value: '{{USER_PARAM}}' },
                    z: 'string()',
                    test: 'USD,EUR'
                }
            ],
            modifiers: []
        },
        getHistoricalData: {
            requestMethod: 'GET',
            route: '/data/v2/histoday?fsym={{USER_PARAM}}&tsym={{USER_PARAM}}&limit={{USER_PARAM}}',
            parameters: [
                {
                    position: { location: 'query', key: 'fsym', value: '{{USER_PARAM}}' },
                    z: 'string()',
                    test: 'BTC'
                },
                {
                    position: { location: 'query', key: 'tsym', value: '{{USER_PARAM}}' },
                    z: 'string()',
                    test: 'USD'
                },
                {
                    position: { location: 'query', key: 'limit', value: '{{USER_PARAM}}' },
                    z: 'number().optional()',
                    test: 30
                }
            ],
            modifiers: []
        }
    }
}
```

## Error Handling

FlowMCP provides comprehensive error handling across all operations with structured error messages and validation feedback.

### Validation Errors

All methods perform input validation and return structured error information:

```js
const result = FlowMCP.validateSchema({ schema: invalidSchema })
if (!result.status) {
    console.error('Validation failed:')
    result.messages.forEach(msg => console.error(`- ${msg}`))
}
```

### HTTP Request Errors

The fetch method provides detailed error information for failed requests:

```js
const result = await FlowMCP.fetch({ schema, userParams, serverParams, routeName })
if (!result.status) {
    console.error('Request failed:')
    result.messages.forEach(msg => console.error(`- ${msg}`))
    // Possible errors: network issues, HTTP status codes, JSON parsing errors
}
```

### Schema Filtering Warnings

The filtering system collects and reports all issues found during processing:

```js
const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas({
    arrayOfSchemas: schemas,
    includeNamespaces: ['nonexistent'],
    excludeNamespaces: [],
    activateTags: ['unknownNamespace.route']
})

// Console output:
// Filtering completed with warnings:
// - Namespace 'unknownNamespace' not found in schemas
// - Route 'route' not found in namespace 'validNamespace'
// Filtered 0 schemas successfully.
```

### Common Error Categories

1. **Schema Validation Errors**: Missing required fields, invalid structure
2. **Parameter Validation Errors**: Type mismatches, missing required parameters
3. **HTTP Errors**: Network failures, API rate limits, authentication issues
4. **Filter Errors**: Invalid namespace/route references, syntax errors
5. **Processing Errors**: JSON parsing failures, response format issues

## Testing & Validation

FlowMCP includes a comprehensive testing framework with automatic test generation and execution capabilities.

### Automatic Test Generation

```js
// Generate tests from schema
const tests = FlowMCP.getAllTests({ schema })

// Execute all tests
const results = []
for (const test of tests) {
    const result = await FlowMCP.fetch({
        schema,
        userParams: test.userParams,
        serverParams: { apiKey: 'test-key' },
        routeName: test.routeName
    })
    
    results.push({
        route: test.routeName,
        status: result.status,
        error: result.status ? null : result.messages
    })
}

console.log('Test Results:', results)
```

### Manual Testing

```js
// Test specific routes with custom parameters
const testCases = [
    { route: 'getCurrentPrice', params: { fsym: 'BTC', tsyms: 'USD' } },
    { route: 'getCurrentPrice', params: { fsym: 'ETH', tsyms: 'EUR' } },
    { route: 'getHistoricalData', params: { fsym: 'BTC', tsym: 'USD', limit: 10 } }
]

for (const testCase of testCases) {
    const result = await FlowMCP.fetch({
        schema,
        userParams: testCase.params,
        serverParams: {},
        routeName: testCase.route
    })
    
    console.log(`${testCase.route}: ${result.status ? 'PASS' : 'FAIL'}`)
}
```

### Validation Testing

```js
// Test schema validation
const validationTests = [
    { schema: validSchema, expected: true },
    { schema: invalidSchema, expected: false },
    { schema: incompleteSchema, expected: false }
]

validationTests.forEach((test, index) => {
    const result = FlowMCP.validateSchema({ schema: test.schema })
    const passed = result.status === test.expected
    console.log(`Validation Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'}`)
})
```

## Performance & Optimization

### Schema Filtering Performance

The filtering system is optimized for large schema arrays with efficient algorithms:

```js
// Performance test with 1000 schemas
const largeSchemaArray = Array(1000).fill(null).map((_, index) => ({
    namespace: `namespace${index}`,
    tags: ['tag1', 'tag2'],
    routes: { route1: {}, route2: {} }
}))

const startTime = Date.now()
const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas({
    arrayOfSchemas: largeSchemaArray,
    includeNamespaces: [],
    excludeNamespaces: [],
    activateTags: ['tag1']
})
const endTime = Date.now()

console.log(`Filtered ${filteredArrayOfSchemas.length} schemas in ${endTime - startTime}ms`)
```

### HTTP Request Optimization

- Native fetch API for improved performance
- Intelligent error handling and retry logic
- Efficient parameter processing and URL construction
- Automatic response parsing with fallback strategies

### Memory Management

- Minimal memory footprint with efficient data structures
- Automatic cleanup of temporary processing data
- Optimized string handling and JSON processing

## Documentation

For additional documentation and examples:

- **FILTERING.md** - Complete schema filtering specification and syntax guide
- **tests/** - Comprehensive test suite with examples for all functionality
- **schemas/** - Example schema definitions for popular APIs

## License

MIT