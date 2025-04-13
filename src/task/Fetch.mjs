import axios from 'axios'


class Fetch {
    static async from( { schema, userParams, serverParams, routeName } ) {
        const { requestMethod, url, headers, body, modifiers } = Fetch
            .#prepare( { schema, userParams, serverParams, routeName } )

        const struct = await Fetch
            .#execute( { requestMethod, url, headers, body, modifiers } )

        return struct
    }


    static async #execute( { requestMethod, url, headers, body, modifiers } ) {
        let struct = {
            'status': true,
            'messages': [],
            'data': null,
        }

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

        for( const [ position, __, func ] of modifiers ) {
            if( position !== 'post' ) { continue }
            try {
                struct = await func( struct )
            } catch( e ) {
                struct['status'] = false
                struct['messages'].push( e.message )
            }
        }

        return struct
    }


    static #prepare( { schema, userParams, serverParams, routeName }  ) {
        const { root, headers: _headers, routes } = schema
        const route = routes[ routeName]
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
            .filter( ( param ) => {
                const { position } = param
                const [ _, __, type ] = position
                if( type !== 'body' ) { return false }
                return true
            } )
            .reduce( ( acc, param ) => {
                const { position } = param
                const [ key, value, _ ] = position
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                acc[ position[ 0 ] ] = modValue
                return acc
            }, {} )

        let url = route['parameters']
            .filter( ( param ) => { 
                const { position } = param
                const [ _, __, type ] = position
                if( type !== 'insert' ) { return false }
                return true
            } )
            .reduce( ( acc, param ) => {
                const { position } = param
                const [ key, value ] = position

                const from = `:${key}`
                const to = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                acc = acc.replaceAll( from, to )
                return acc
            }, `${root}${_route}` )

        const { query } = route['parameters']
            .filter( ( param ) => {
                const { position } = param
                if( position[ 2 ] !== 'query' ) { return false }
                return true
            } )
            .reduce( ( acc, param, index, arr ) => {
                const { position } = param
                const [ key, value ] = position
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )

                acc['iterate'][ key ] = modValue
                if( index === arr.length - 1 ) {
                    acc['query'] = new URLSearchParams( acc['iterate'] ).toString()
                }
                return acc
            }, { 'iterate': {}, 'query': '' } )
    
        url += query === '' ? '' : `?${query}`

        modifiers
            .forEach( ( [ _, key ], index ) => {
                const func = schema['modifiers'][ key ]

                if( typeof func !== 'function' ) {
                    throw new Error( `Modifier not found: ${key}` )
                }
                modifiers[ index ].push( func )
            } )


        return { requestMethod, url, headers, body, modifiers } 
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
            if( !Object.hasOwn( serverParams, paramName ) ) {
                throw new Error( `Server param not found: ${paramName}` )
            }

            result = value.replace( '{{' + paramName + '}}', serverParams[ paramName ] )
        } else {
            result = value
        }

        return result
    }
}


export { Fetch }