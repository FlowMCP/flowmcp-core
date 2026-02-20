import { stringify as flattedStringify } from 'flatted'
import { Validation } from './Validation.mjs'

import util from 'util'


class Fetch {
    static async from({ schema, userParams, serverParams, routeName } ) {
        let struct = {
            status: true,
            messages: [],
            data: null,
            dataAsString: null
        };
    
        const { requestMethod, url, headers, body, modifiers, _allParams } = Fetch
            .#prepare( { schema, userParams, serverParams, routeName } )
        userParams = { ...userParams, _allParams }
        let payload = { requestMethod, url, headers, body, modifiers }

        await Validation
            .getTypes()['enums']['phases']
            .reduce( ( promise, phaseType ) => promise.then( async () => {
                const relevantModifiers = modifiers
                    .filter( ( { phase } ) => phase.includes( phaseType ) )
                if( phaseType === "execute" && relevantModifiers.length === 0 ) {
                    struct = await Fetch.#executeDefault( { struct, payload } )
                } else if (relevantModifiers.length > 0) {
                    const result = await Fetch.#modifierLoop( { struct, payload, userParams, routeName, phaseType } )
                    struct = result.struct
                    payload = result.payload
                }
            } ), Promise.resolve() )

        const { dataAsString } = Fetch
            .stringifyResponseData( { data: struct['data'] } )
        struct['dataAsString'] = dataAsString

        return { struct, payload }
    }
    


/*
    static async from1( { schema, userParams, serverParams, routeName } ) {
        let struct = {
            'status': true,
            'messages': [],
            'data': null,
            'dataAsString': null
        }

        const { requestMethod, url, headers, body, modifiers } = Fetch
            .#prepare( { schema, userParams, serverParams, routeName } )
        
        let payload = { requestMethod, url, headers, body, modifiers }

        const { struct: s1, payload: p1 } = await Fetch
            .#modifierLoop( { struct, payload, userParams, routeName, 'phaseType': 'pre' } )
        struct = { ...s1 }; payload = { ...p1 }
        if( struct['status'] === false ) { return { struct, payload } }

        if( modifiers.map( ( { phase } ) => !phase.includes( 'execute' ) ).some( a => a ) )  {
            struct = await Fetch
                .#execute( { struct: { ...s1 }, payload: { ...p1 } } )
        } else {
            const { struct: s2, payload: p2 } = await Fetch
                .#modifierLoop( { struct: { ...struct }, payload: { ...p1 }, userParams, routeName, 'phaseType': 'execute' } )
            struct = { ...s2 }; payload = { ...p2 }
        }

        const { struct: s3, payload: p3 } = await Fetch
            .#modifierLoop( { struct, payload, userParams, routeName, 'phaseType': 'post' } )
        struct = { ...s3 }; payload = { ...p3 }
        if( struct['status'] === false ) { return { struct, payload } }

        const { dataAsString } = Fetch
            .stringifyResponseData( { data: struct['data'] } )
        struct['dataAsString'] = dataAsString

        return { struct, payload }
    }
*/

    static #prepare( { schema, userParams, serverParams, routeName }  ) {
        const { root, headers: _headers, routes } = schema
        const route = routes[ routeName ]
        const { requestMethod, route: _route } = route
        let { modifiers } = route

        const headers = Object
            .entries( _headers )
            .reduce( ( acc, [ key, value ] ) => {
                acc[ key ] = Fetch.#insertValue( { 
                    userParams, serverParams, key, value 
                } )
                return acc
            }, {} )

        const parametersWithRequired = route['parameters']
            .map( ( param ) => {
                if( !Object.hasOwn( param, 'z' ) ) { 
                    return { 'required': true, ...param }
                }
                const { z } = param
                const required = z['options'].includes( 'optional()') ? false : true

                return { required, ...param } 
            } )

        const body = parametersWithRequired
            .filter( ( { position: { location } } ) => location === 'body' )
            .reduce( ( acc, { position: { key, value }, required } ) => {
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value, required } )
                acc[ key ] = modValue
                return acc
            }, {} )

        let url = parametersWithRequired
            .filter( ( { position: { location } } ) => location === 'insert' )
            .reduce( ( acc, { position: { key, value }, required } ) => {

                const to = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                acc = acc
                    .replaceAll( `:${key}`, to )
                    .replaceAll( `{{${key}}}`, to )
                return acc
            }, `${root}${_route}` )
        url = Object
            .entries( serverParams )
            .reduce( ( acc, [ key, value ] ) => {
                acc = acc.replaceAll( `{{${key}}}`, value )
                return acc
            }, url )

        const { iterate } = parametersWithRequired
            .filter( ( { position: { location } } ) => location === 'query' )
            .reduce( ( acc, { position: { key, value }, required }, index, arr ) => {
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value, required } )
                if( modValue === undefined ) { return acc }

                acc['iterate'][ key ] = modValue
                return acc
            }, { 'iterate': {} } )

        let query = ''
        query += new URLSearchParams( iterate ).toString()
        if( query !== '' ) {
            const separator = url.includes( '?' ) ? '&' : '?'
            url += separator + query
        }

        modifiers = modifiers
            .reduce( ( acc, { phase, handlerName }, index ) => {
                const func = schema['handlers'][ handlerName ]
                acc.push( { phase, handlerName, func } )
                return acc
            }, [] )

        const _allParams = schema['routes'][ routeName ]['parameters']
            .reduce( ( acc, { position: { key, value } } ) => {
                const modValue = Fetch
                    .#insertValue( { userParams, serverParams, key, value } )
                if( modValue === undefined ) { return acc }
                acc[ key ] = modValue
                return acc
            }, {} )

        return { requestMethod, url, headers, body, modifiers, _allParams } 
    }


    static async #executeDefault( { struct, payload } ) {
        return await Fetch.#execute( { struct, payload } )
    }




    static async #execute( { struct, payload } ) {
        const { requestMethod, url, headers, body, modifiers } = payload
        struct['status'] = struct['messages'].length === 0
        if( struct['status'] === false ) { return struct }

        switch( requestMethod.toUpperCase() ) {
            case 'GET':
                try {
                    const response = await fetch( url, { 
                        method: 'GET',
                        headers 
                    } )
                    
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
                break;
            case 'POST':
                try {
                    const response = await fetch( url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers
                        },
                        body: JSON.stringify( body )
                    } )
                    
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

                break;
            default:
                struct['status'] = false
                struct['messages'].push( 'Unknown method:', requestMethod )
                console.warn('Unknown method:', requestMethod )
        }

        if( struct['status'] === false ) { return struct }

        return struct
    }


    static async #modifierLoop( { struct, payload, userParams, routeName, phaseType } ) {
        const { modifiers } = payload
        for( const { phase, func } of modifiers ) {
            if( phase !== phaseType ) { continue }
            try {
                const { struct: _struct, payload: _payload } = await func( { struct, payload, userParams, routeName, phaseType } )
                struct = _struct
                payload = _payload
            } catch( e ) {
                struct['status'] = false
                struct['messages'].push( e.message )
            }
        }

        return { struct, payload }
    }
    


    static getErrorMessages( { error } ) {
        let messages = []
        
        // For fetch Response errors (HTTP status errors)
        if( error.message && error.message.includes( 'HTTP' ) ) {
            messages.push( error.message )
        }
        // For network errors (no response)
        else if( error.name === 'TypeError' || error.message.includes( 'fetch' ) ) {
            messages.push( 'No response received from server.' )
            messages.push( 'Network error:', error.message )
        }
        // For JSON parsing errors
        else if( error.name === 'SyntaxError' && error.message.includes( 'JSON' ) ) {
            messages.push( 'Invalid JSON response from server.' )
            messages.push( 'Parse error:', error.message )
        }
        // For general errors
        else {
            messages.push( 'Error in setting up the request:', error.message )
        }

        return messages
    }



    static #insertValue( { userParams, serverParams, key, value, required } ) {
        let type = null
        let params = null
        let paramName = null

        if( value.includes( '{{USER_PARAM}}' ) ) { params = userParams; type = 'user' } 
        else if( value.includes( '{{' ) ) { params = serverParams; type = 'server' }
        if( !params ) { return value }

        if( type === 'user' ) { paramName = key }
        else if( type === 'server' ) {
            const start = value.indexOf( '{{' )
            const end = value.indexOf( '}}' )
            if( start !== -1 && end !== -1 ) {
                paramName = value.slice( start + 2, end ).trim()
            } else {
                throw new Error( `Invalid parameter format: ${value}` )
            }
        }

        if( type === 'user' ) {
            if( userParams[ key ] === undefined ) { return undefined }
            value = value.replace( '{{USER_PARAM}}', userParams[ key ] )
        } else if( type === 'server' ) {
            value = value.replace( '{{' + paramName + '}}', params[ paramName ] )
        } else {
            throw new Error( `Invalid parameter type: ${type}` )
        }

        return value
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