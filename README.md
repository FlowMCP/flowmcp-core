[![CircleCI](https://img.shields.io/circleci/build/github/a6b8/multiThreadz/main)]() ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# FlowMCP

**FlowMCP** provides a declarative and modular approach to integrating various REST APIs using a unified schema system with `zod`-based validation. Its goal is to make APIs easy to consume, test, and extend — even when they differ greatly in structure and design.

## Features
- Automatically generates `zod` interfaces from API schemas
- Standardized routing for REST endpoints
- Built-in test generation
- Supports API-specific transformation logic via modifiers
- Easily extensible using JSON-like schema definitions

## Quickstart

### Installation
```bash
npm install flowmcp
```

### Example Usage

Define your API schema (e.g. `testSchema.mjs`) and execute a request using `FlowMCP`:

```js
import { testSchema as schema } from "./tests/data/testSchema.mjs";
import { FlowMCP } from "flowmcp";

const serverParams = { ETHERSCAN_API_KEY: 'your-api-key-here' };

// Load automatically generated tests
const tests = FlowMCP.getAllTests({ schema });
const [routeName, userParams] = tests[0];

// Execute API request
const { status, messages, data } = await FlowMCP.fetch({
  schema,
  userParams,
  serverParams,
  routeName
});

console.log('status:', status);
console.log('data:', data);
```

## Table of Contents
- [FlowMCP](#flowmcp)
  - [Features](#features)
  - [Quickstart](#quickstart)
    - [Installation](#installation)
    - [Example Usage](#example-usage)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Methods](#methods)
    - [`getZodInterfaces({ schema })`](#getzodinterfaces-schema-)
    - [`getAllTests({ schema })`](#getalltests-schema-)
    - [`fetch({ schema, userParams, serverParams, routeName })`](#fetch-schema-userparams-serverparams-routename-)
  - [Schema](#schema)
  - [License](#license)

## Overview

At the core of FlowMCP is a declarative API schema that defines all aspects of an interface: endpoints, parameters, validation, tests, and processing logic. FlowMCP transforms this schema into fully functioning, tested API clients.

## Methods

### `getZodInterfaces({ schema })`
Generates `zod`-based validation interfaces from the schema.

```js
FlowMCP.getZodInterfaces({ schema });
```

### `getAllTests({ schema })`
Returns all test cases defined in the schema.

```js
const tests = FlowMCP.getAllTests({ schema });
```

### `fetch({ schema, userParams, serverParams, routeName })`
Executes the API request as defined in the schema.

```js
const result = await FlowMCP.fetch({
  schema,
  userParams,
  serverParams,
  routeName
});
```

## Schema

An example of a compatible (simplified) schema:

```js
const testSchema = {
  root: "https://api.etherscan.io",
  vars: ["ETHERSCAN_API_KEY"],
  routes: {
    getContractABI: {
      requestMethod: "GET",
      description: "Returns the Contract ABI of a verified smart contract.",
      route: "/api",
      parameters: [
        { position: ["module", "contract", "query"] },
        { position: ["action", "getabi", "query"] },
        { position: ["address", "{{USER_PARAM}}", "query"], z: ["string", "min(42)", "max(42)"] },
        { position: ["apikey", "{{ETHERSCAN_API_KEY}}", "query"] }
      ],
      tests: [
        {
          _description: "Basic test for getContractABI",
          address: "0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413"
        }
      ],
      modifiers: [["post", "convertToJSON"]]
    }
  },
  modifiers: {
    convertToJSON: async (struct) => {
      if (struct.data.status !== "1") {
        struct.status = false;
        struct.messages.push(struct.data.message);
        return struct;
      }
      struct.data = struct.data.result;
      return struct;
    }
  }
};
```

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.