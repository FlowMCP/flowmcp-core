/**
 * FlowMCP — MIT License
 *
 * DISCLAIMER: This code orchestrates calls to third-party APIs. Each API has
 * its own Terms of Services. FlowMCP makes no representation about TOS
 * compliance, data licensing, or fitness for any purpose. Users are solely
 * responsible for reviewing and adhering to each API provider's terms.
 *
 * For more information, see LICENSE.md and DISCLAIMER.md in the repo root.
 */

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
                const handler = raw[ routeName ]
                const effectiveHandler = handler || {}
                const { preRequest, postRequest, executeRequest } = effectiveHandler

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
