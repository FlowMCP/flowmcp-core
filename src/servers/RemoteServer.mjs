import express from 'express'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { FlowMCP } from './../index.mjs'


class RemoteServer {
    #app
    #stickyTransports
    #config
    #state
    #silent


    constructor( { silent = false } = {} ) {
        this.#silent = silent || false
        this.#config = { 
            'rootUrl': 'http://localhost', 
            'port': 8080, 
            'suffixes': {
                'sse': '/sse',
                'stickyStreamable': '/sticky',
                'statelessStreamable': '/stateless'
            },
            'serverDescription': {
                'name': 'Remote Server',
                'description': 'A remote Model Context Protocol server',
                'version': '1.2.0'
            }
        }

        this.#state = {
            'routes': [],
            'stickyTransports': { 'sse': {}, 'http': {} }
        }

        this.#app = express()
        this.#app.use( express.json() )
        // this.#state['stickyTransports'] = { 'sse': {}, 'http': {} }

        return true
    }


    setConfig( { overwrite } ) {
        const allowedKeys = [ 'rootUrl', 'port', 'suffixes' ]
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


    async addActivationPayloads( { routePath, activationPayloads, transportProtocols, bearer=null } ) {
        this.#validateSetRoute( { routePath, activationPayloads, transportProtocols } )
        const authMiddleware = bearer ? this.#createAuthMiddleware( { bearer } ) : null
        const payload = { routePath, activationPayloads }

        await Promise.all(
            transportProtocols
                .map( async( protocol ) => {
                    if( protocol === 'sse' ) { this.#setStickySseRoute( payload, authMiddleware, protocol ) }
                    else if( protocol === 'stickyStreamable' ) { this.#setStickyStreamableRoute( payload, authMiddleware, protocol ) }
                    else if( protocol === 'statelessStreamable' ) { await this.#setStatelessStreamableRoute( payload , authMiddleware, protocol ) }
                    else { console.warn( `Unknown transport protocol: ${protocol}` ) }

                    return true
                } )
        )

        return true
    }


    start() {
        const { rootUrl, port } = this.#config
        const server = this.#app.listen( port, () => {
            this.#printRoutes()
        } )

        process.on( 'SIGINT', () => {
            server.close(() => {
                this.#silent ? console.log("HTTP server closed.") : ''
                process.exit()
            } )
        } )

        return server
    }


    #validateSetRoute( { routePath, activationPayloads, transportProtocols } ) {
        const messages = []
        if( !routePath || typeof routePath !== 'string' || !routePath.startsWith('/') ) {
            messages.push( 'Invalid routePath. It must be a string starting with "/".' )
        }

        if( !Array.isArray( activationPayloads ) || activationPayloads.length === 0 ) {
            messages.push( 'activationPayloads must be a non-empty array.' )
        } else {
            activationPayloads
                .forEach( ( obj, index ) => {
                    if( typeof obj !== 'object' ) {
                        messages.push( `activationPayloads[${index}] must be an object.` )
                        return false
                    }
                    const { server, schema, serverParams, activateTags } = obj
                    const n = [ 
                        // [ 'server',       server       ], 
                        [ 'schema',       schema       ], 
                        [ 'serverParams', serverParams ], 
                        [ 'activateTags',   activateTags ]
                    ]
                        .forEach( ( [ name, value ] ) => {
                            if( !obj[ name ] ) {
                                messages.push( `activationPayloads[${index}] is missing required property: ${name}` )
                            }
                        } )
                } )
        }

        const validProtocols = Object.keys( this.#config.suffixes )
        if( !Array.isArray( transportProtocols ) || transportProtocols.length === 0 ) {
            messages.push( `transportProtocols must be a non-empty array. Valid protocols are: ${validProtocols.join(', ')}` )
        } else {
            transportProtocols
                .forEach( ( protocol, index ) => {
                    if( !validProtocols.includes( protocol ) ) {
                        messages.push( `transportProtocols[${index}] is not a valid protocol. Valid protocols are: ${validProtocols.join(', ')}` )
                    }
                } )
        }

        if( messages.length > 0 ) {
            throw new Error( `Validation failed:\n- ${messages.join( '\n- ' )}` )
        }

        return true
    }


    async #setStatelessStreamableRoute( { routePath, activationPayloads }, authMiddleware, protocol ) {
        let { fullPath } = this
            .#getRoute( { routePath, protocol } )
        const middlewares = authMiddleware ? [authMiddleware] : []

        var server = new McpServer( {
            name: "",
            version: "1.0.0"
        } )
        this.#injectFlowMCP( { server, activationPayloads } )

        this.#app.post( fullPath, ...middlewares, async (req, res ) => {
            try {
                const transport = new StreamableHTTPServerTransport( {
                            sessionIdGenerator: undefined,
                        } )

                res.on( 'close', () => {
                    this.#silent ? console.log( 'Request closed' ) : ''
                    transport.close()
                    server.close()
                } )

                await server.connect( transport )
                await transport.handleRequest( req, res, req.body )
            } catch( error ) {
                console.error('Error handling MCP request:', error)
                if (!res.headersSent) {
                res
                    .status( 500 )
                    .json( {
                        jsonrpc: '2.0',
                        error: { code: -32603, message: 'Internal server error' },
                        id: null,
                    } )
                }
            }
        } )

        this.#app.get( fullPath, ...middlewares, async ( req, res ) => {
            this.#silent ? console.log( 'Received GET MCP request' ) : ''
            res
                .writeHead( 405 )
                .end( 
                    JSON.stringify( {
                        jsonrpc: '2.0',
                        error: { code: -32000, message: 'Method not allowed.' },
                        id: null
                    } ) 
                )
        } )

        this.#app.delete( fullPath, ...middlewares, async ( req, res ) => {
            this.#silent ? console.log( 'Received DELETE MCP request' ) : ''
            res
                .writeHead( 405 )
                .end(
                    JSON.stringify( {
                        jsonrpc: '2.0',
                        error: { code: -32000, message: 'Method not allowed.' },
                        id: null
                    } )
                )
        } )

        return true
    }


    #setStickyStreamableRoute({ routePath, activationPayloads }, authMiddleware, protocol ) {
        let { fullPath } = this
            .#getRoute( { routePath, protocol } )
        const middlewares = authMiddleware ? [authMiddleware] : []
            
        this.#app.post( fullPath, ...middlewares, async( req, res ) => {
            const sessionId = req.headers['mcp-session-id']
            this.#silent ? console.log(`Incoming POST request at ${fullPath} with session ID: ${sessionId}`) : ''

            let transport
            if( sessionId && this.#state['stickyTransports']['http'][ sessionId ] ) {
                this.#silent ? console.log( `Reusing existing session: ${sessionId}` ) : ''
                transport = this.#state['stickyTransports']['http'][ sessionId ]
            } else if( !sessionId && isInitializeRequest( req.body ) ) {
                this.#silent ? console.log( `Initializing new session` ) : ''
                transport = new StreamableHTTPServerTransport( {
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: ( newSessionId ) => {
                        this.#silent ? console.log(`Session initialized: ${newSessionId}`) : ''
                        this.#state['stickyTransports']['http'][ newSessionId ] = transport
                    }
                } )

                transport.onclose = () => {
                    if( transport.sessionId ) {
                        this.#silent ? console.log(`Closing session: ${transport.sessionId}`) : ''
                        delete this.#state['stickyTransports']['http'][transport.sessionId]
                    }
                }

                const server = new McpServer({ name: 'example-server', version: '1.0.0' })
                this.#injectFlowMCP( { server, activationPayloads } )

                await server.connect( transport )
            } else {
                this.#silent ? console.warn(`Invalid request: No valid session ID`) : ''
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
                    id: null
                })
                return
            }

            await transport.handleRequest( req, res, req.body )
        } )

        this.#app.get( path, ...middlewares, ( req, res ) => this.#handleSessionRequest( req, res ) )
        this.#app.delete( path, ...middlewares, ( req, res ) => this.#handleSessionRequest( req, res ) )

        return true
    }


    #setStickySseRoute( { routePath, activationPayloads }, authMiddleware, protocol ) {
        const { fullPath, messagesPath } = this
            .#getRoute( { routePath, protocol } )
        const middlewares = authMiddleware ? [authMiddleware] : []

        this.#app.get( fullPath, ...middlewares, async ( req, res ) => {
            const transport = new SSEServerTransport( messagesPath, res )
            const { _sessionId } = transport
            this.#state['stickyTransports']['sse'][ _sessionId ] = transport

            res.on('close', () => {
                delete this.#state['stickyTransports']['sse'][ _sessionId ]
            } )

            const server = new McpServer( {
                name: "backwards-compatible-server",
                version: "1.0.0"
            } )
            this.#injectFlowMCP( { server, activationPayloads } )
            await server.connect( transport )
        })

        this.#app.post( messagesPath, ...middlewares, async ( req, res ) => {
            const { sessionId } = req.query
            const transport = this.#state['stickyTransports']['sse'][sessionId]

            if( transport ) { await transport.handlePostMessage(req, res, req.body) } 
            else { res.status(400).send('No transport found for sessionId') }
        } )

        return true
    }


    async #handleSessionRequest(req, res) {
        const sessionId = req.headers['mcp-session-id']
        if (!sessionId || !this.#state['stickyTransports']['sse'][sessionId]) {
            res.status(400).send('Invalid or missing session ID')
            return
        }

        const transport = this.#state['stickyTransports']['sse'][sessionId]
        await transport.handleRequest(req, res)
    }


    #printRoutes() {
        const { rootUrl, port } = this.#config
        this.#silent ? console.log(`🚀 Server is running on ${rootUrl}:${port}`) : ''
        this.#silent ? console.log('📜 Available Routes:') : ''
        
        this.#state['routes']
            .forEach(route => {
                this.#silent ? console.log(`-  ${rootUrl}:${port}${route}`) : ''
            } )

        return true
    }

    
    #getRoute( { routePath, protocol } ) {
        if( !routePath.startsWith( '/' ) ) { routePath = `/${routePath}` }
        const { suffixes } = this.#config
        const suffix = this.#config['suffixes'][ protocol ]
        const keyName = `fullPath`
        const struct = {}
        struct[ keyName ] = `${routePath}${suffix}`
        if( protocol === 'sse' ) { struct['messagesPath'] = `${struct[ keyName ]}/messages` }

        Object
            .values( struct )
            .forEach( route => { this.#state['routes'].push( route ) } )

        return struct
    }


    #injectFlowMCP( { server, activationPayloads } ) {
        activationPayloads
            .forEach(( { serverParams, schema, activateTags } ) => {
                FlowMCP.activateServerTools( { server, schema, serverParams, activateTags, 'silent': true } )
            } )
        return true
    }


    #createAuthMiddleware( { bearer } ) {
        return ( req, res, next ) => {
            const authHeader = req.headers['authorization']
            if( !authHeader || !authHeader.startsWith( 'Bearer ' ) ) {
                return res
                    .status( 401 )
                    .json( { error: 'Missing or malformed Authorization header' } )
            }

            const token = authHeader.split(' ')[ 1 ]
            if( token !== bearer ) {
                return res
                    .status( 403 )
                    .json( { error: 'Invalid Veritoken' } )
            }

            next()
        }
    }
}


export { RemoteServer }