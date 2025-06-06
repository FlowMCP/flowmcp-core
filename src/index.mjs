import { Interface } from './task/Interface.mjs'
import { Validation } from './task/Validation.mjs'
import { Fetch } from './task/Fetch.mjs'
import { Payload } from './task/Payload.mjs'
import { Test } from './task/Test.mjs'

// import { LocalServer } from './servers/LocalServer.mjs'
// import { RemoteServer } from './servers/RemoteServer.mjs'


class FlowMCP {
    static getArgvParameters( {
        argv,
        includeNamespaces = [],
        excludeNamespaces = [],
        activateTags = []
    } ) {        
        const result = {
            'source': 'unknown',
            includeNamespaces,
            excludeNamespaces,
            activateTags
        }
        
        const argMappings = {
            '--source': 'source',
            '--includeNamespaces=': 'includeNamespaces',
            '--excludeNamespaces=': 'excludeNamespaces',
            '--activateTags=': 'activateTags'
        }
        
        const args = process.argv.slice( 2 )
        args
            .forEach( ( arg ) => {
                Object
                    .entries( argMappings )
                    .forEach( ( [ prefix, key ] ) => {
                        if( arg.startsWith( prefix ) ) {
                            const [ _, value ] = arg.split( '=' )
                            result[ key ] = value.split( ',' ).filter( Boolean )
                        }
                    } )
            } )

        if( Array.isArray( result['source'] ) ) {
            result['source'] = result['source'][ 0 ]
        }

        return result
    }


    static prepareActivations( { 
        arrayOfSchemas, 
        envObject, 
        activateTags=[],
        includeNamespaces = [],
        excludeNamespaces = []
    } ) {
        Validation.prepareActivations( { arrayOfSchemas, envObject, activateTags, includeNamespaces, excludeNamespaces } )

        const { status, messages, activationPayloads } = Payload
            .prepareActivation( { arrayOfSchemas, envObject, activateTags } )
        if( !status ) { 
            throw new Error( `Activation preparation failed: ${messages.join( ', ' )}` ) 
        }

        return { activationPayloads }
    }


    static activateServerTools( { server, schema, serverParams, activateTags=[], validate=true, silent=true } ) {
        if( validate ) {
            Validation.schema( { schema } )
            Validation.serverParams( { schema, serverParams } )
        }

        const { routes } = schema
        let routeNames = Object
            .keys( routes )

        if( activateTags.length > 0 ) {
            const { tags } = schema
            const _tags = tags
                .map( tag => tag.toLowerCase().split( '.' )[ 0 ].toLowerCase() )
            const _activateTags = activateTags
                .map( tag => tag.toLowerCase().split( '.' )[ 0 ].toLowerCase() )
            if( tags.length === 0 ) { return [] }
            const set1 = new Set( _tags )
            const hasMatch = _activateTags.some(item => set1.has(item) )
            if( !hasMatch ) { return [] }

            const { includeRouteName, excludeRouteName } = tags
                .filter( ( tag ) => tag.includes( '.' ) )
                .filter( ( tag ) => _activateTags.includes( tag.split( '.' )[ 0 ] ) )
                .reduce( ( acc, tag ) => {
                    const [ tagName, routeNameCmd] = tag.split( '.' )
                    if( routeNameCmd.startsWith( '!' ) ) {
                        const routeName = routeNameCmd.substring( 1 )
                        acc.excludeRouteName.push( routeName )
                    } else {
                        acc.includeRouteName.push( routeNameCmd )
                    }
                    return acc
                }, { includeRouteName: [], excludeRouteName: [] } )
            routeNames = routeNames
                .filter( ( routeName ) => {
                    if( includeRouteName.length > 0 ) {
                        return includeRouteName.includes( routeName )
                    } else if( excludeRouteName.length > 0 ) {
                        return !excludeRouteName.includes( routeName )
                    } else {
                        return true
                    }
                } )

        }

        const mcpTools = routeNames
            .reduce( ( acc, routeName ) => {
                const { toolName, mcpTool } = FlowMCP
                    .activateServerTool( { server, schema, serverParams, routeName, 'validate': false } )
                acc[ toolName ] = mcpTool
                return acc
            }, {} )

        if( !silent && routeNames.length > 0 ) {
            const colWidths = [ 16, 3, 50 ]
            const id = schema.namespace
            const anzahl = routeNames.length
            const routes = routeNames.join( ', ' )
            
            const formatCell = ( value, width ) => {
                const str = String( value )
                if( str.length > width ) {
                    return str.substring( 0, width - 3 ) + '...'
                }
                return str.padEnd( width )
            }
            
            const row = [
                formatCell( id, colWidths[ 0 ] ),
                formatCell( anzahl, colWidths[ 1 ] ),
                formatCell( routes, colWidths[ 2 ] )
            ].join( " | " )

            console.warn( row )
        }

        return { mcpTools }
    }


    static activateServerTool( { server, schema, routeName, serverParams, validate=true } ) {
        const { toolName, description, zod, func } = FlowMCP
            .prepareServerTool( { schema, serverParams, routeName, validate } )
        const mcpTool = server.tool( toolName, description, zod, func )

        return { toolName, mcpTool }
    }


    static prepareServerTool( { schema, serverParams, routeName, validate=true } ) {
        if( validate ) {
            Validation.schema( { schema } )
            Validation.serverParams( { schema, serverParams } )
            Validation.routeName( { schema, routeName } )
        }

        const { toolName, description, zod } = Interface
            .toServerTool( { schema, routeName } )
        const result = {
            toolName,
            description,
            zod,
            'func': async( userParams ) => {
                const { struct, payload } = await Fetch
                    .from( { schema, userParams, serverParams, routeName } )
                const { status, messages, dataAsString } = struct
                if( !status ) {
                    return { content: [ { type: "text", text: `Error: ${messages.join( ', ' )}` } ] }
                } else {
                    return { content: [ { type: "text", text: `Result: ${dataAsString}` } ] }
                }
            }
        }

        return result 
    }


    static getZodInterfaces( { schema } ) {
        Validation.schema( { schema } )
        const result = Interface.from( { schema } )

        return result
    }


    static getAllTests( { schema } ) {
        Validation.schema( { schema } )
        const result = Test.all( { schema } )

        return result
    }


    static validateSchema( { schema } ) {
        const result = Validation
            .schema( { schema, 'strict': false } )

        return result
    }


    static async fetch( { schema, userParams, serverParams, routeName } ) {
        Validation.schema( { schema } )
        Validation.serverParams( { schema, serverParams } )
        Validation.routeName( { schema, routeName } )
        Validation.userParams( { schema, userParams, routeName } )
        const { struct, payload } = await Fetch
            .from( { schema, userParams, serverParams, routeName } )

        return struct
    }
}


export { FlowMCP, Validation }