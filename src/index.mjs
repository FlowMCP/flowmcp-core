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
        activateTags,  // deprecated use filterArrayOfSchemas instead
        includeNamespaces, // deprecated use filterArrayOfSchemas instead
        excludeNamespaces // deprecated use filterArrayOfSchemas instead
    } ) {
        Validation.prepareActivations( { arrayOfSchemas, envObject, activateTags, includeNamespaces, excludeNamespaces } )

        const { status, messages, activationPayloads } = Payload
            .prepareActivations( { arrayOfSchemas, envObject } )
        if( !status ) { 
            throw new Error( `Activation preparation failed: ${messages.join( ', ' )}` ) 
        }

        return { activationPayloads }
    }


    static filterArrayOfSchemas( { arrayOfSchemas, includeNamespaces, excludeNamespaces, activateTags } ) {
        Validation.filterArrayOfSchemas( { arrayOfSchemas, includeNamespaces, excludeNamespaces, activateTags } )

        const filteredByNamespaces = arrayOfSchemas
            .filter( ( schema ) => {
                const { namespace } = schema
                if( includeNamespaces.length > 0 ) {
                    return includeNamespaces.includes( namespace )
                } else if( excludeNamespaces.length > 0 ) {
                    return !excludeNamespaces.includes( namespace )
                } else {
                    return true
                }
            } )
// console.log( 'A', 'Schemas', filteredByNamespaces.length, '                                   Routes', filteredByNamespaces.reduce( (acc, s ) => { acc += Object.keys( s.routes ).length; return acc }, 0 ) )

        const { filterTags, schemaFilters } = activateTags
            .reduce( ( acc, tag ) => {
                if( !tag.includes( '.' ) ) {
                    acc['filterTags' ].push( tag.toLowerCase() )
                    return acc
                } else {
                    const [ namespace, routeNameCmd ] = tag.split( '.' )
                    if( !Object.hasOwn( acc['schemaFilters'], namespace ) ) {
                        acc['schemaFilters'][ namespace ] = []
                    }
                    acc['schemaFilters'][ namespace ].push( routeNameCmd.toLowerCase() )
                }
                return acc
            }, { 'filterTags': [], 'schemaFilters': {} } )
// console.log( 'B', 'FilterTags', filterTags.length, 'SchemaFilters', Object.keys( schemaFilters ).length )

        const filteredByNamespaceAndTags = filteredByNamespaces
            .filter( ( schema ) => {
                if( filterTags.length === 0 ) { return true }
                else {
                    const { tags } = schema
                    const hasTag = filterTags
                        .some( tag => tags.map( t => t.toLowerCase() ).includes( tag ) )
                    return hasTag
                }
            } )
// console.log( 'C', 'FilteredByNamespaceAndTags', filteredByNamespaceAndTags.length, '                Routes', filteredByNamespaceAndTags.reduce( (acc, s ) => { acc += Object.keys( s.routes ).length; return acc }, 0 ) )

        const two = filteredByNamespaceAndTags
            .filter( ( schema ) => {
                const { namespace } = schema
                if( Object.keys( schemaFilters ).length === 0 ) { return true }
                return Object.hasOwn( schemaFilters, namespace )
            } )
            .map( ( schema ) => {
                const { namespace } = schema
                const newSchema = { ...schema }
                if( Object.keys( schemaFilters ).length === 0 ) { return newSchema }
                const schemaFilter = schemaFilters[ namespace ]
                const hasIncludeRouteNames = schemaFilter
                    .some( routeNameCmd => !routeNameCmd.startsWith( '!' ) )

                newSchema['routes'] = Object
                    .entries( schema['routes'] )
                    .filter( ( [ routeName ] ) => {
                        // exclude routes with '!' prefix
                        const excludeTag = `!${routeName.toLowerCase()}`
                        if( schemaFilter.includes( excludeTag ) ) { return false }
                        if( hasIncludeRouteNames ) {
                            const hasIncludeRouteName = schemaFilter
                                .some( ( routeNameCmd ) => {
                                    if( routeNameCmd.startsWith( '!' ) ) { return false }
                                    return routeNameCmd.toLowerCase() === routeName.toLowerCase()
                                } ) 
                            return hasIncludeRouteName
                        } else { return true }
                    } )
                    .reduce( ( acc, [ routeName, route ] ) => {
                        acc[ routeName ] = route
                        return acc
                    }, {} )

                return newSchema
            } )
            .filter( ( schema ) => {
                const { routes } = schema
                return Object.keys( routes ).length > 0
            } )
// console.log( 'D', 'FilteredByNamespaceAndTagsAndSchemaFilters', two.length, 'Routes', two.reduce( (acc, s ) => { acc += Object.keys( s.routes ).length; return acc }, 0 ) )

        return { filteredArrayOfSchemas: two }
    }


    static activateServerTools( { server, schema, serverParams, validate=true, silent=true } ) {
        if( validate ) {
            Validation.schema( { schema } )
            Validation.serverParams( { schema, serverParams } )
        }

        const { routes } = schema
        let routeNames = Object
            .keys( routes )

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