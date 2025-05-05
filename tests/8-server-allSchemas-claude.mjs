import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'


import { getSchemas } from './helpers/claude.mjs'
import { FlowMCP } from './../src/index.mjs'

console.warn( 'TEST', process.argv )
console.warn( 'AAA', process.argv?.env)
console.warn( 'BBB', process.env )

const server = new McpServer( {
    name: 'Test',
    description: 'This is a secure way to import external APIs into your AI assistant.',
    version: '1.2.0'
} )

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absoluter Pfad
const absolutePath = path.resolve(__dirname, './../schemas/v1.2.0/');
console.warn( 'absolutePath', absolutePath )


await getSchemas( { dirPath: absolutePath } )
    // .filter( ( a, index ) => index < 1 )
    .reduce( ( promise, a ) => promise.then( async () => {
        const { path: _path } = a
        const { schema } = await import( _path )
        const { requiredServerParams } = schema
        const serverParams = requiredServerParams
            .reduce( ( acc, key ) => {
                acc[ key ] = process.env[ key ]
                return acc
            }, {} )
console.warn( 'serverParams', serverParams )
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
