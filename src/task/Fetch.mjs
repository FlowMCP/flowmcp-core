import axios from 'axios'
import { stringify as flattedStringify } from 'flatted'
import util from 'util'



class Fetch {
    static async from( { schema, userParams, serverParams, routeName } ) {
        const { requestMethod, url, headers, body, modifiers } = Fetch
            .#prepare( { schema, userParams, serverParams, routeName } )
        const struct = await Fetch
            .#execute( { requestMethod, url, headers, body, modifiers } )

        const { dataAsString } = Fetch
            .stringifyResponseData( { data: struct['data'] } )
        struct['dataAsString'] = dataAsString
        
        return struct
    }


    static #prepare( { schema, userParams, serverParams, routeName }  ) {
        const { root, headers: _headers, routes } = schema
        const route = routes[ routeName ]
        const { requestMethod, route: _route, modifiers } = route

        const headers = Object
            .entries( _headers )
            .reduce( ( acc, [ key, value ] ) => {
                acc[ key ] = Fetch.#insertValue( { 
                    userParams, serverParams, key, value 
                } )
                return acc
            }, {} )

        const body = route['parameters']
            .filter( ( { position: { location } } ) => location === 'body' )
            .reduce( ( acc, { position: { key, value } } ) => {
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                acc[ key ] = modValue
                return acc
            }, {} )

        let url = route['parameters']
            .filter( ( { position: { location } } ) => location === 'insert' )
            .reduce( ( acc, { position: { key, value } } ) => {
                const to = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                acc = acc.replaceAll( `:${key}`, to )
                return acc
            }, `${root}${_route}` )

        const { query } = route['parameters']
            .filter( ( { position: { location } } ) => location === 'query' )
            .reduce( ( acc, { position: { key, value } }, index, arr ) => {
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                acc['iterate'][ key ] = modValue
                if( index === arr.length - 1 ) {
                    // acc['query'] = new URLSearchParams( acc['iterate'] ).toString()
                    const str = new URLSearchParams( acc['iterate'] ).toString()
                    acc['query'] = `?${str}`
                }
                return acc
            }, { 'iterate': {}, 'query': '' } )
        url += query

        modifiers
            .forEach( ( { phase, handlerName }, index ) => {
                modifiers[ index ]['func'] = schema['handlers'][ handlerName ]
            } )

        return { requestMethod, url, headers, body, modifiers } 
    }


    static async #execute( { requestMethod, url, headers, body, modifiers } ) {
        let payload = { requestMethod, url, headers, body }
        let struct = {
            'status': true,
            'messages': [],
            'data': null
        }

        for( const { phase, func } of modifiers ) {
            if( phase !== 'pre' ) { continue }
            try {
                const { struct: s, payload: p } = await func( { struct, payload, phase: 'pre' } )
                struct = s
                payload = p
            } catch( e ) {
                struct['status'] = false
                struct['messages'].push( e.message )
            }
        }

        struct['status'] = struct['messages'].length === 0
        if( struct['status'] === false ) { return struct }

        switch( requestMethod.toUpperCase() ) {
            case 'GET':
                try {
                    const response = await axios.get( url, { headers } )
                    const { data } = response
                    struct['data'] = data
                } catch( e ) {
                    struct['status'] = false
                    struct['messages'].push( e.message )
                }
                break;
            case 'POST':
                try {
                    const response = await axios.post( url, body, { headers } )
                    const { data } = response
                    struct['data'] = data
                } catch( e ) {
                    struct['status'] = false
                    struct['messages'].push( e.message )
                }

                break;
            default:
                struct['status'] = false
                struct['messages'].push( 'Unknown method:', requestMethod )
                console.warn('Unknown method:', requestMethod )
        }

        if( struct['status'] === false ) { return struct }

        for( const { phase, func } of modifiers ) {
            if( phase !== 'post' ) { continue }
            try {
                const { struct: s, payload: p } = await func( { struct, payload, 'phase': 'post' } )
                struct = s
                payload = p
            } catch( e ) {
                struct['status'] = false
                struct['messages'].push( e.message )
            }
        }

        return struct
    }


    static #insertValue( { userParams, serverParams, key, value } ) {
        let result = null
        if( value === '{{USER_PARAM}}' ) {
            if( !Object.hasOwn( userParams, key ) ) {
                throw new Error( `User param not found: ${key}` )
            }

            result = value.replace( '{{USER_PARAM}}', userParams[ key ] )
        } else if( value.startsWith( '{{' ) ) {
            const paramName = value.slice( 2, -2 )
            result = value.replace( '{{' + paramName + '}}', serverParams[ paramName ] )
        } else {
            result = value
        }

        return result
    }


    static stringifyResponseData( { data } ) {
        let dataAsString = null
        try {
            dataAsString = JSON.stringify( data )
        } catch( jsonError ) {
            try {
                dataAsString = flattedStringify( data )
            } catch( flattedError ) {
                dataAsString = util.inspect( data, { 'depth': null, 'compact': false } )
            }
        }

        return { dataAsString }
    }
}


export { Fetch }