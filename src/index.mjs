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

        const errors = []

        // Step 1: Namespace Filtering
        const filteredByNamespaces = arrayOfSchemas
            .filter( ( schema ) => {
                const { namespace } = schema
                if( includeNamespaces.length > 0 ) {
                    return includeNamespaces
                        .some( includeNs => includeNs.toLowerCase() === namespace.toLowerCase() )
                } else if( excludeNamespaces.length > 0 ) {
                    return !excludeNamespaces
                        .some( excludeNs => excludeNs.toLowerCase() === namespace.toLowerCase() )
                } else {
                    return true
                }
            } )

        // Parse activateTags into filterTags and schemaFilters
        const { filterTags, schemaFilters, invalidTags } = activateTags
            .reduce( ( acc, tag ) => {
                if( typeof tag !== 'string' || tag.trim() === '' ) {
                    acc['invalidTags'].push( tag )
                    return acc
                }

                if( !tag.includes( '.' ) ) {
                    acc['filterTags'].push( tag.toLowerCase() )
                } else {
                    const parts = tag.split( '.' )
                    if( parts.length !== 2 || parts[0] === '' || parts[1] === '' ) {
                        acc['invalidTags'].push( tag )
                        return acc
                    }

                    const [ namespace, routeNameCmd ] = parts
                    if( !Object.hasOwn( acc['schemaFilters'], namespace.toLowerCase() ) ) {
                        acc['schemaFilters'][ namespace.toLowerCase() ] = []
                    }
                    acc['schemaFilters'][ namespace.toLowerCase() ].push( routeNameCmd.toLowerCase() )
                }
                return acc
            }, { 'filterTags': [], 'schemaFilters': {}, 'invalidTags': [] } )

        // Collect invalid syntax errors
        invalidTags
            .forEach( tag => {
                errors.push( `Invalid activateTags syntax: '${tag}'` )
            } )

        // Step 2 & 3: Combined Tag and Route Filtering
        const processedSchemas = filteredByNamespaces
            .filter( ( schema ) => {
                const { tags } = schema
                const namespaceKey = schema.namespace.toLowerCase()
                
                // If no filters at all, keep all schemas
                if( filterTags.length === 0 && Object.keys( schemaFilters ).length === 0 ) {
                    return true
                }
                
                // If only route filters (no tag filters), only keep schemas with route filters
                if( filterTags.length === 0 && Object.keys( schemaFilters ).length > 0 ) {
                    return Object.hasOwn( schemaFilters, namespaceKey )
                }
                
                // If only tag filters (no route filters), filter by tags
                if( filterTags.length > 0 && Object.keys( schemaFilters ).length === 0 ) {
                    return filterTags.some( filterTag => 
                        tags.some( schemaTag => schemaTag.toLowerCase() === filterTag )
                    )
                }
                
                // If both tag and route filters, use OR logic
                const hasMatchingTag = filterTags
                    .some( filterTag => 
                        tags.some( schemaTag => schemaTag.toLowerCase() === filterTag )
                    )
                
                const hasRouteFilter = Object.hasOwn( schemaFilters, namespaceKey )
                
                return hasMatchingTag || hasRouteFilter
            } )
            .map( ( schema ) => {
                const { namespace } = schema
                const newSchema = { ...schema }
                
                if( Object.keys( schemaFilters ).length === 0 ) { 
                    return newSchema 
                }

                const namespaceKey = namespace.toLowerCase()
                
                // If no route filters for this namespace, keep all routes
                if( !Object.hasOwn( schemaFilters, namespaceKey ) ) {
                    return newSchema
                }

                const schemaFilter = schemaFilters[ namespaceKey ]
                const hasIncludeRouteNames = schemaFilter
                    .some( routeNameCmd => !routeNameCmd.startsWith( '!' ) )

                // Track non-existent routes
                const existingRouteNames = Object.keys( schema.routes )
                    .map( routeName => routeName.toLowerCase() )

                schemaFilter
                    .forEach( routeNameCmd => {
                        const routeName = routeNameCmd.startsWith( '!' ) 
                            ? routeNameCmd.substring( 1 ) 
                            : routeNameCmd
                        
                        if( !existingRouteNames.includes( routeName ) ) {
                            errors.push( `Route '${routeName}' not found in namespace '${namespace}'` )
                        }
                    } )

                newSchema['routes'] = Object
                    .entries( schema['routes'] )
                    .filter( ( [ routeName ] ) => {
                        const routeNameLower = routeName.toLowerCase()
                        
                        // Exclude routes with '!' prefix (exclude takes priority)
                        const excludeTag = `!${routeNameLower}`
                        if( schemaFilter.includes( excludeTag ) ) { 
                            return false 
                        }
                        
                        if( hasIncludeRouteNames ) {
                            // If include routes specified, only keep included ones
                            const hasIncludeRouteName = schemaFilter
                                .some( ( routeNameCmd ) => {
                                    if( routeNameCmd.startsWith( '!' ) ) { return false }
                                    return routeNameCmd === routeNameLower
                                } )
                            return hasIncludeRouteName
                        } else { 
                            return true 
                        }
                    } )
                    .reduce( ( acc, [ routeName, route ] ) => {
                        acc[ routeName ] = route
                        return acc
                    }, {} )

                return newSchema
            } )

        // Collect errors for non-existent namespaces in schemaFilters
        Object.keys( schemaFilters )
            .forEach( namespaceKey => {
                const hasMatchingSchema = filteredByNamespaces
                    .some( schema => schema.namespace.toLowerCase() === namespaceKey )
                
                if( !hasMatchingSchema ) {
                    // Find original namespace name for error message
                    const originalNamespace = activateTags
                        .find( tag => tag.includes( '.' ) && tag.split( '.' )[0].toLowerCase() === namespaceKey )
                        ?.split( '.' )[0] || namespaceKey
                    
                    errors.push( `Namespace '${originalNamespace}' not found in schemas` )
                }
            } )

        // Step 4: Remove schemas with empty routes and collect errors
        const finalSchemas = processedSchemas
            .filter( ( schema ) => {
                const hasRoutes = Object.keys( schema.routes ).length > 0
                
                if( !hasRoutes ) {
                    errors.push( `Schema '${schema.namespace}' has no routes after filtering` )
                    return false
                }
                
                return true
            } )

        // Report collected errors
        if( errors.length > 0 ) {
            const errorMessage = `
Filtering completed with warnings:
${errors.map( err => `- ${err}` ).join( '\n' )}

Filtered ${finalSchemas.length} schemas successfully.`
            
            console.warn( errorMessage.trim() )
        }

        return { filteredArrayOfSchemas: finalSchemas }
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