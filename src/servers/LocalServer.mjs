import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { FlowMCP } from './../index.mjs'


class LocalServer {
    #server
    #silent
    #config


    constructor( { silent = false } = {} ) {
        this.#silent = silent || false
        this.#config = { 
            'serverDescription': {
                'name': 'Local Server',
                'description': 'A local Model Context Protocol server',
                'version': '1.2.2', 
            }
        }

        return true
    }


     setConfig( { overwrite } ) {
        const allowedKeys = [ 'serverDescription' ]
        if( !Object.keys( overwrite ).every( key => allowedKeys.includes( key ) ) ) {
            throw new Error( `Invalid keys in config: ${userKeys.filter( key => !allowedKeys.includes( key ) ).join( ', ' )}` )
        }
        Object
            .entries( overwrite )
            .forEach( ( [ key, value ] ) => {
                this.#config[ key ] = value
            } )

        return true
    }


    addActivationPayloads( { activationPayloads } ) {
        if( this.#server === undefined ) {
            const { serverDescription } = this.#config
            this.#server = new McpServer( serverDescription )
        }

        activationPayloads
            .forEach( ( { serverParams, schema, activateTags } ) => {
                FlowMCP
                    .activateServerTools( {
                        'server': this.#server, 
                        schema, 
                        serverParams, 
                        activateTags, 
                        'silent': this.#silent 
                    } )
            } )

        return true
    }


    async start() {
        const transport = new StdioServerTransport()
        try { await this.#server.connect( transport ) } 
        catch( err ) { console.error( 'Failed to start server:', err ) }
    }
}

export { LocalServer }