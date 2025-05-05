import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { fileURLToPath } from 'url'
import path from 'path'

import { FlowMCP, Server } from './../src/index.mjs'


const server = new McpServer( {
    name: 'Test',
    description: 'This is a secure way to import external APIs into your AI assistant.',
    version: '1.2.0'
} )


const config = {
    'scriptRootFolder': path.dirname( fileURLToPath( import.meta.url ) ),
    'schemasRootFolder': './../schemas/v1.2.0/',
    'localEnvPath': './../../../../.env'
}

const { args } = Server
    .getArgvParameters( { argv: process.argv } )
console.log( 'args', args )
const { schemas, params } = await Server
    .prepare( { ...args, ...config } )
const activateTags = [ ...config['includeTags'] ]
schemas
    .forEach( ( schema ) => {
        const serverParams = schema
            .requiredServerParams
            .reduce( ( acc, key ) => { acc[ key ] = params[ key ]; return acc }, {} )
        FlowMCP.activateServerTools( { server, schema, serverParams, activateTags, 'silent':false } )
    } )

async function startServer() {
    const transport = new StdioServerTransport()
    try {
        await server.connect( transport )
    } catch( err ) {
        console.error( 'Failed to start server:', err )
    }
}

await startServer()