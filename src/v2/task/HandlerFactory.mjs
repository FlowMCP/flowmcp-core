class HandlerFactory {
    static create( { handlersFn, sharedLists, libraries, routeNames } ) {
        const raw = handlersFn
            ? handlersFn( { sharedLists, libraries } )
            : {}

        if( typeof raw !== 'object' || raw === null || Array.isArray( raw ) ) {
            throw new Error( 'HandlerFactory: Factory must return a plain object' )
        }

        const messages = []
        const handlerKeys = Object.keys( raw )

        handlerKeys
            .forEach( ( key ) => {
                if( !routeNames.includes( key ) ) {
                    messages.push( `HandlerFactory: Handler key "${key}" does not match any route` )
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

        return { handlerMap }
    }
}


export { HandlerFactory }
