import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { fileURLToPath } from 'url'
import path from 'path'

import { FlowMCP, Server } from './../src/index.mjs'


const config = {
    'name': 'Test',
    'description': 'This is a development server for testing purposes.',
    'version': '1.2.0', 
}

Server
    .getArgvParameters( {
        'argv': process.argv,
        'claudeArgv': '--launched-by=claude',
        'includeNamespaces': [],
        'excludeNamespaces': [],
        'activateTags': [],
    } )
    .prepare( {
        'scriptRootFolder': path.dirname( fileURLToPath( import.meta.url ) ),
        'schemasRootFolder': './../schemas/v1.2.0/',
        'localEnvPath': './../../../../.env',
    } )
    .then( async( schemas ) => {
        const server = new McpServer( config )
        schemas.forEach( ( { serverParams, schema, activateTags } ) => {
            FlowMCP.activateServerTools( { server, schema, serverParams, activateTags, 'silent':false } )
        } )

        const transport = new StdioServerTransport()
        try { await server.connect( transport ) } 
        catch( err ) { console.error( 'Failed to start server:', err ) }
        return true
    } )
    .catch( ( e ) => {
        console.error( 'Error:', e )
        process.exit( 1 )
    } )