import { stringify as flattedStringify } from 'flatted'
import util from 'util'


class Fetch {
    static async execute( { main, handlerMap, userParams, serverParams, routeName } ) {
        let struct = {
            status: true,
            messages: [],
            data: null,
            dataAsString: null
        }

        const route = main['routes'][ routeName ]
        if( !route ) {
            struct['status'] = false
            struct['messages'].push( `Route "${routeName}" not found in schema` )

            return { struct }
        }

        const { method, path } = route
        const { root, headers: defaultHeaders } = main

        let payload = Fetch
            .#buildPayload( { root, path, method, route, userParams, serverParams, defaultHeaders } )

        const handler = handlerMap[ routeName ] || {}

        if( handler['preRequest'] ) {
            try {
                const result = await handler['preRequest']( {
                    struct: { url: payload['url'], method: payload['method'], headers: payload['headers'], body: payload['body'] },
                    payload: { ...userParams }
                } )

                if( result['struct'] ) {
                    payload['url'] = result['struct']['url'] || payload['url']
                    payload['headers'] = result['struct']['headers'] || payload['headers']
                    payload['body'] = result['struct']['body'] || payload['body']
                }
            } catch( err ) {
                struct['status'] = false
                struct['messages'].push( `preRequest error: ${err.message}` )

                return { struct }
            }
        }

        if( handler['executeRequest'] ) {
            try {
                const result = await handler['executeRequest']( {
                    struct,
                    payload: { ...payload, userParams, serverParams }
                } )

                if( result['struct'] ) {
                    struct = result['struct']
                }
                if( result['response'] !== undefined ) {
                    struct['data'] = result['response']
                }
            } catch( err ) {
                struct['status'] = false
                struct['messages'].push( `executeRequest error: ${err.message}` )

                return { struct }
            }
        } else {
            struct = await Fetch
                .#executeRequest( { struct, payload } )
        }

        if( !struct['status'] ) {
            return { struct }
        }

        if( handler['postRequest'] ) {
            try {
                const result = await handler['postRequest']( {
                    response: struct['data'],
                    struct: { url: payload['url'], method: payload['method'], headers: payload['headers'], body: payload['body'] },
                    payload: { ...userParams }
                } )

                if( result['response'] !== undefined ) {
                    struct['data'] = result['response']
                }
            } catch( err ) {
                struct['status'] = false
                struct['messages'].push( `postRequest error: ${err.message}` )

                return { struct }
            }
        }

        const { dataAsString } = Fetch
            .stringifyResponseData( { data: struct['data'] } )
        struct['dataAsString'] = dataAsString

        return { struct }
    }


    static #buildPayload( { root, path, method, route, userParams, serverParams, defaultHeaders } ) {
        const headers = {}

        Object.entries( defaultHeaders || {} )
            .forEach( ( [ key, value ] ) => {
                headers[ key ] = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
            } )

        const parametersWithRequired = ( route['parameters'] || [] )
            .map( ( param ) => {
                if( !Object.hasOwn( param, 'z' ) ) {
                    return { required: true, ...param }
                }
                const { z } = param
                const options = z['options'] || []
                const required = !options.includes( 'optional()' )

                return { required, ...param }
            } )

        const body = parametersWithRequired
            .filter( ( { position: { location } } ) => {
                const isBody = location === 'body'

                return isBody
            } )
            .reduce( ( acc, { position: { key, value }, required } ) => {
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value, required } )
                acc[ key ] = modValue

                return acc
            }, {} )

        let url = parametersWithRequired
            .filter( ( { position: { location } } ) => {
                const isInsert = location === 'insert'

                return isInsert
            } )
            .reduce( ( acc, { position: { key, value }, required } ) => {
                const to = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                acc = acc
                    .replaceAll( `:${key}`, to )
                    .replaceAll( `{{${key}}}`, to )

                return acc
            }, `${root}${path}` )

        url = Object.entries( serverParams || {} )
            .reduce( ( acc, [ key, value ] ) => {
                acc = acc.replaceAll( `{{${key}}}`, value )

                return acc
            }, url )

        const queryParams = parametersWithRequired
            .filter( ( { position: { location } } ) => {
                const isQuery = location === 'query'

                return isQuery
            } )
            .reduce( ( acc, { position: { key, value }, required } ) => {
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value, required } )
                if( modValue !== undefined ) {
                    acc[ key ] = modValue
                }

                return acc
            }, {} )

        const queryString = new URLSearchParams( queryParams ).toString()
        if( queryString ) {
            const separator = url.includes( '?' ) ? '&' : '?'
            url += `${separator}${queryString}`
        }

        return { url, method, headers, body }
    }


    static async #executeRequest( { struct, payload } ) {
        const { method, url, headers, body } = payload

        try {
            const fetchOptions = { method, headers }

            if( method === 'POST' || method === 'PUT' ) {
                fetchOptions['headers'] = {
                    'Content-Type': 'application/json',
                    ...headers
                }
                fetchOptions['body'] = JSON.stringify( body )
            }

            const response = await fetch( url, fetchOptions )

            if( !response.ok ) {
                throw new Error( `HTTP ${response.status}: ${response.statusText}` )
            }

            const data = await response.json()
            struct['data'] = data
        } catch( error ) {
            struct['status'] = false
            const messages = Fetch.getErrorMessages( { error } )
            struct['messages'].push( ...messages )
        }

        return struct
    }


    static #insertValue( { userParams, serverParams, key, value, required } ) {
        let type = null
        let params = null
        let paramName = null

        if( value.includes( '{{USER_PARAM}}' ) ) {
            params = userParams
            type = 'user'
        } else if( value.includes( '{{SERVER_PARAM:' ) ) {
            params = serverParams
            type = 'server'
        } else if( value.includes( '{{' ) ) {
            params = serverParams
            type = 'server'
        }

        if( !params ) {
            return value
        }

        if( type === 'user' ) {
            paramName = key
            if( userParams[ key ] === undefined ) {
                return undefined
            }
            value = value.replace( '{{USER_PARAM}}', userParams[ key ] )
        } else if( type === 'server' ) {
            const start = value.indexOf( '{{' )
            const end = value.indexOf( '}}' )
            if( start !== -1 && end !== -1 ) {
                let raw = value.slice( start + 2, end ).trim()
                if( raw.startsWith( 'SERVER_PARAM:' ) ) {
                    raw = raw.replace( 'SERVER_PARAM:', '' )
                }
                paramName = raw
            }
            value = value.replace( `{{${value.slice( value.indexOf( '{{' ) + 2, value.indexOf( '}}' ) )}}}`, params[ paramName ] || '' )
        }

        return value
    }


    static getErrorMessages( { error } ) {
        const messages = []

        if( error.message && error.message.includes( 'HTTP' ) ) {
            messages.push( error.message )
        } else if( error.name === 'TypeError' || error.message.includes( 'fetch' ) ) {
            messages.push( 'No response received from server.' )
            messages.push( `Network error: ${error.message}` )
        } else if( error.name === 'SyntaxError' && error.message.includes( 'JSON' ) ) {
            messages.push( 'Invalid JSON response from server.' )
            messages.push( `Parse error: ${error.message}` )
        } else {
            messages.push( `Error in setting up the request: ${error.message}` )
        }

        return messages
    }


    static stringifyResponseData( { data } ) {
        let dataAsString = null
        try {
            dataAsString = JSON.stringify( data )
        } catch( jsonError ) {
            try {
                dataAsString = flattedStringify( data )
            } catch( flattedError ) {
                dataAsString = util.inspect( data, { depth: null, compact: false } )
            }
        }

        return { dataAsString }
    }
}


export { Fetch }
