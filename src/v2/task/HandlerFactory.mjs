class HandlerFactory {
    static create( { handlersFn, sharedLists, libraries, routeNames, resources } ) {
        const raw = handlersFn
            ? handlersFn( { sharedLists, libraries } )
            : {}

        if( typeof raw !== 'object' || raw === null || Array.isArray( raw ) ) {
            throw new Error( 'HandlerFactory: Factory must return a plain object' )
        }

        const resourceNames = Object.keys( resources || {} )
        const allValidKeys = [ ...routeNames, ...resourceNames ]
        const messages = []
        const handlerKeys = Object.keys( raw )

        handlerKeys
            .forEach( ( key ) => {
                if( !allValidKeys.includes( key ) ) {
                    messages.push( `HandlerFactory: Handler key "${key}" does not match any route or resource` )
                }
            } )

        if( messages.length > 0 ) {
            throw new Error( messages.join( '; ' ) )
        }

        const handlerMap = {}

        routeNames
            .forEach( ( routeName ) => {
                const handler = raw[ routeName ] || {}
                const { preRequest, postRequest, executeRequest } = handler

                handlerMap[ routeName ] = {
                    preRequest: typeof preRequest === 'function' ? preRequest : null,
                    executeRequest: typeof executeRequest === 'function' ? executeRequest : null,
                    postRequest: typeof postRequest === 'function' ? postRequest : null
                }
            } )

        const resourceHandlerMap = {}

        resourceNames
            .forEach( ( resourceName ) => {
                const resourceHandler = raw[ resourceName ]

                if( !resourceHandler || typeof resourceHandler !== 'object' ) {
                    return
                }

                resourceHandlerMap[ resourceName ] = {}

                const queryNames = Object.keys( resourceHandler )

                queryNames
                    .forEach( ( queryName ) => {
                        const queryHandler = resourceHandler[ queryName ] || {}
                        const { postRequest } = queryHandler

                        resourceHandlerMap[ resourceName ][ queryName ] = {
                            postRequest: typeof postRequest === 'function' ? postRequest : null
                        }
                    } )
            } )

        return { handlerMap, resourceHandlerMap }
    }
}


export { HandlerFactory }
