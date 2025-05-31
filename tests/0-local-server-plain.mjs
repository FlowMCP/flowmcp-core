import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { FlowMCP } from './../src/index.mjs'


const server = new McpServer( {
    'name': 'Local Server',
    'description': 'A local Model Context Protocol server',
    'version': '1.2.2', 
} )

const schema = {
    namespace: "poap",
    name: "POAP GraphQL",
    description: "GraphQL endpoint for accessing POAP event data and metadata",
    docs: ["https://public.compass.poap.tech/v1/graphql"],
    tags: ["production", "poap.getTypename"],
    flowMCP: "1.2.0",
    root: "https://public.compass.poap.tech/v1/graphql",
    requiredServerParams: [],
    headers: {
        "content-type": "application/json"
    },
    routes: {
        getTypename: {
            requestMethod: "POST",
            description: "Basic connectivity test to retrieve __typename from the POAP GraphQL endpoint",
            route: "/",
            parameters: [ { position: { key: "query", value: "query { __typename }", location: "body" }, z: { primitive: "string()", options: [] } } ],
            tests: [ { _description: "Run GraphQL __typename test" } ],
            modifiers: []
        }
    },
    handlers: {}
}

FlowMCP
    .activateServerTool( {
        'server': server, 
        schema, 
        routeName: 'getTypename',
        serverParams: {}, 
        activateTags: [], 
        'silent': true 
    } )

const transport = new StdioServerTransport()
server.connect( transport )
