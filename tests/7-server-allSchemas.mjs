import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { getServerParams } from './helpers/utils.mjs'
import { getSchemas } from './helpers/utils2.mjs'
import { FlowMCP } from './../src/index.mjs'


const server = new McpServer( {
    name: 'Test',
    description: 'This is a secure way to import external APIs into your AI assistant.',
    version: '1.2.0'
} )

const envPath = './../../../.env'
await getSchemas( { dirPath: './schemas/v1.2.0/' } )
    // .filter( ( a, index ) => index < 1 )
    .reduce( ( promise, a ) => promise.then( async () => {
        const { path: _path } = a
        const { schema } = await import( _path )
        const { serverParams } = getServerParams( { 'path': envPath, schema } )
        FlowMCP.activateServerTools( { server, schema, serverParams } )
    } ), Promise.resolve() )

async function startServer() {
    const transport = new StdioServerTransport()
    try {
        await server.connect( transport )
    } catch( err ) {
        console.error( 'Failed to start server:', err )
    }
}

await startServer()
