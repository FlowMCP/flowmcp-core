import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { FlowMCP } from './../src/index.mjs'
import { getServerParams } from './helpers/utils.mjs'


const server = new McpServer( {
  name: 'FlowMCP',
  description: 'This is a secure way to import external APIs into your AI assistant.',
  version: '1.0.0',
} )

const path = './../../../.env'
const { schema } = await import( 'flowmcp-schemas/schemas/etherscan/schema.mjs' )
const { serverParams } = getServerParams( { path, schema } )
FlowMCP.activateServerTools( { server, schema, serverParams } )


async function startServer() {
    const transport = new StdioServerTransport()
    try {
        await server.connect(transport)
    } catch (err) {
        console.error( 'Failed to start server:', err )
    }
}

await startServer()
