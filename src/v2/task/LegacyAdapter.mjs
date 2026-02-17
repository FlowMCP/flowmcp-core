class LegacyAdapter {
    static detect( { module } ) {
        const schema = module['schema'] || null
        const main = module['main'] || null

        if( main && main['version'] && main['version'].startsWith( '2.' ) ) {
            return { isLegacy: false, format: 'v2' }
        }

        if( schema && schema['flowMCP'] ) {
            return { isLegacy: true, format: `v${schema['flowMCP']}` }
        }

        return { isLegacy: false, format: 'unknown' }
    }


    static adapt( { legacySchema } ) {
        const warnings = []
        warnings.push( 'LegacyAdapter: Schema uses v1.x format, automatic conversion applied' )

        const {
            flowMCP,
            namespace,
            name,
            description,
            root,
            requiredServerParams,
            headers,
            tags,
            routes: legacyRoutes,
            handlers: legacyHandlers
        } = legacySchema

        const main = {
            namespace: namespace || 'unknown',
            name: name || 'Unknown',
            description: description || '',
            version: '2.0.0',
            root: root || 'https://unknown',
            routes: {}
        }

        if( tags ) { main['tags'] = tags }
        if( requiredServerParams ) { main['requiredServerParams'] = requiredServerParams }
        if( headers ) { main['headers'] = headers }

        const handlerMappings = {}
        const routeNames = Object.keys( legacyRoutes || {} )

        routeNames
            .forEach( ( routeName ) => {
                const legacyRoute = legacyRoutes[ routeName ]
                const { convertedRoute, routeHandlers } = LegacyAdapter
                    .#convertRoute( { legacyRoute, routeName, legacyHandlers, warnings } )

                main['routes'][ routeName ] = convertedRoute

                if( routeHandlers ) {
                    handlerMappings[ routeName ] = routeHandlers
                }
            } )

        const hasHandlers = Object.keys( handlerMappings ).length > 0

        let handlersFn = null
        if( hasHandlers ) {
            handlersFn = ( { sharedLists, libraries } ) => {
                return { ...handlerMappings }
            }
        }

        return { main, handlersFn, hasHandlers, warnings }
    }


    static #convertRoute( { legacyRoute, routeName, legacyHandlers, warnings } ) {
        const {
            requestMethod,
            route: routePath,
            description,
            parameters,
            tests,
            modifiers
        } = legacyRoute

        const convertedRoute = {
            method: requestMethod || 'GET',
            path: routePath || '/',
            description: description || '',
            parameters: parameters || []
        }

        let routeHandlers = null

        if( modifiers && modifiers.length > 0 ) {
            routeHandlers = LegacyAdapter
                .#convertModifiers( { modifiers, routeName, legacyHandlers, warnings } )
        }

        return { convertedRoute, routeHandlers }
    }


    static #convertModifiers( { modifiers, routeName, legacyHandlers, warnings } ) {
        const handlers = {}

        modifiers
            .forEach( ( modifier ) => {
                const { phase, handlerName, fn } = modifier

                const resolvedFn = fn || ( legacyHandlers && legacyHandlers[ handlerName ] ) || null

                if( !resolvedFn ) {
                    warnings.push(
                        `LegacyAdapter: Route "${routeName}" modifier references handler "${handlerName}" which was not found`
                    )

                    return
                }

                if( phase === 'execute' ) {
                    handlers['executeRequest'] = async ( { struct, payload } ) => {
                        const result = await resolvedFn( {
                            struct,
                            payload,
                            userParams: payload['userParams'] || {},
                            routeName,
                            phaseType: 'execute'
                        } )

                        return { struct: result['struct'], payload: result['payload'] }
                    }
                }

                if( phase === 'pre' || phase.includes( 'pre' ) ) {
                    handlers['preRequest'] = async ( { struct, payload } ) => {
                        const result = await resolvedFn( {
                            struct,
                            payload,
                            userParams: {},
                            routeName,
                            phaseType: 'pre'
                        } )

                        return { struct: result['struct'], payload: result['payload'] }
                    }
                }

                if( phase === 'post' || phase.includes( 'post' ) ) {
                    handlers['postRequest'] = async ( { response, struct, payload } ) => {
                        const wrappedStruct = { ...struct, data: response }
                        const result = await resolvedFn( {
                            struct: wrappedStruct,
                            payload,
                            userParams: {},
                            routeName,
                            phaseType: 'post'
                        } )

                        return { response: result['struct']['data'] || response }
                    }
                }
            } )

        const hasHandlers = Object.keys( handlers ).length > 0

        return hasHandlers ? handlers : null
    }
}


export { LegacyAdapter }
