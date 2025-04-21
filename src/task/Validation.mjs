import { z } from 'zod'


class Validation {
    static getTypes() {
        const types = {
            'types': {
                'meta': [
                    [ 'name',                 'string'              ],
                    [ 'description',          'string'              ],
                    [ 'version',              'string'              ],
                    [ 'flowMCP',              'string'              ],
                    [ 'root',                 'string'              ],
                    [ 'requiredServerParams', 'arrayOfStrings'      ],
                    [ 'headers',              'objectKeyValues'     ],
                    [ 'routes',               'objectOfObjects'     ],
                    [ 'handlers',             'objectKeyFunctions'  ]
                ],
                'route': [
                    [ 'requestMethod',        'string'              ],
                    [ 'description',          'string'              ],
                    [ 'route',                'string'              ],
                    [ 'parameters',           'arrayOfObjects'      ],
                    [ 'tests',                'arrayOfObjects'      ],
                    [ 'modifiers',            'arrayOfObjects'      ]
                ],
                'parametes': [
                    [ 'position',             'arrayOfStrings'      ]
                ],
                'position': [
                    [ 'key',                  'string'              ],
                    [ 'value',                'string'              ],
                    [ 'location',             'string'              ]
                ],
                'z': [
                    [ 'primitive',            'string'              ],
                    [ 'options',              'arrayOfStrings'      ]
                ],
                'tests': [
                    [ '_description',         'string'              ]
                ],
                'modifiers': [
                    [ 'phase',                'string'              ],
                    [ 'handler',              'string'              ]
                ]
            },
            'enums': {
                'methods':   [ 'GET',  'POST'             ],
                'positions': [ 'body', 'query',  'insert' ],
                // 'phases':    [ 'pre',  'post'             ],
                'phases': [ 'post' ],
                'primitives': [
                    [ 'string',    z.string()     ],
                    [ 'number',    z.number()     ],
                    [ 'boolean',   z.boolean()    ],
                    [ 'object',    z.object( {} ) ]
                ],
                'options': [
                    [ 'min(',      'min',      'float'   ],
                    [ 'max(',      'max',      'float'   ],
                    [ 'length(',   'length',   'int'     ],
                    [ 'enum(',     'enum',     'string'  ],
                    [ 'regex(',    'regex',    'string'  ],
                    [ 'optional(', 'optional', 'empty'   ],
                    [ 'default(',  'default',  'string'  ]
                ]
            },
            'regex': {
                'versionNumber': /:([a-zA-Z_][a-zA-Z0-9_]*)/g
            }
        }

        return types
    }


    static schema( { schema } ) {
        const struct = {
            'status': false,
            'messages': []
        }

        const { 
            types: {
                meta: metaTypes,
            }
        } = Validation.getTypes()

        const { status: s1, messages: m1 } = Validation
            .#testObject( {  object: schema, types: metaTypes } )
        Validation.#error( { status: s1, messages: m1 } )

        const isValidVersion = ( str ) => /^\d+\.\d+\.\d+$/.test( str )
        const { version } = schema
        if( !isValidVersion( version ) ) {
            struct['messages'].push( `Version ${version} is not valid. Must be in the format x.x.x` )
        }
        const { flowMCP } = schema
        if( !isValidVersion( flowMCP ) ) {
            struct['messages'].push( `FlowMCP ${flowMCP} is not valid. Must be in the format x.x.x` )
        }

        const { root } = schema
        const isValidUrl = str => {
            try { new URL( str ); return true } catch { return false }
        }
        if( !isValidUrl( root ) ) {
            struct['messages'].push( `Root ${root} is not valid. Must be a valid URL` )
        }

        const { status: s2, messages: m2 } = Object
            .keys( schema['routes'] )
            .reduce( ( acc, routeName ) => {
                const messages = Validation.#route( { routeName, schema } )
                acc['messages'].push( ...messages )
                return acc
            }, { 'status': false, 'messages': [] } )
        struct['messages'].push( ...m2 )

        struct['status'] = struct['messages'].length === 0
        Validation.#error( struct )

        const { requiredServerParams: schemaServerParams } = schema
        const { allowedServerParams } = Validation
            .#getAllowedServerParams( { schema } )
        allowedServerParams
            .forEach( ( param ) => {
                const test = schemaServerParams.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    struct['messages'].push( `requiredServerParams: Required "${param}" serverParam is missing.` )
                }
            } )
        schemaServerParams
            .forEach( ( param ) => {
                const test = allowedServerParams.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    struct['messages'].push( `requiredServerParams: Unknown "${param}" serverParam. Expected params are ${allowedServerParams.join( ', ')}` )
                }
            } )

        struct['status'] = struct['messages'].length === 0
        Validation.#error( struct )

        return true
    }


    static routeName( { schema, routeName } ) {
        const messages = []
        const id = 'routeName'

        if( !routeName ) {
            messages.push( `${id}: Missing routeName` )
        } else if( typeof routeName !== 'string' ) {
            messages.push( `${id}: routeName must be a string` )
        }
        if( messages.length > 0 ) {
            Validation.#error( { status: false, messages } )
            return false
        }

        const { routes } = schema
        if( !Object.keys( routes ).includes( routeName ) ) {
            messages.push( `${id}: Unknown routeName "${routeName}". Expected routeNames are ${Object.keys( routes ).join( ', ')}` )
        }

        if( messages.length > 0 ) {
            Validation.#error( { status: false, messages } )
            return false
        }

        return true
    }



    static serverParams( { schema, serverParams } ) {
        const messages = []
        const id = 'serverParams'

        if( !serverParams ) {
            messages.push( `${id}: Missing serverParams` )
        } else if( typeof serverParams !== 'object' ) {
            messages.push( `${id}: serverParams must be an object` )
        }
        if( messages.length > 0 ) {
            Validation.#error( { status: false, messages } )
            return false
        }

        const { allowedServerParams } = Validation
            .#getAllowedServerParams( { schema } )

        const allKeys = Object.keys( serverParams )
        allowedServerParams
            .forEach( ( param ) => {
                const test = allKeys.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    messages.push( `${id}: Missing required serverParam "${param}"` )
                }
            } )
        allKeys
            .forEach( ( param ) => {
                const test = allowedServerParams.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    messages.push( `${id}: Unknown serverParam "${param}". Expected params are ${allowedServerParams.join( ', ')}` )
                }
            } )

        if( messages.length > 0 ) {
            Validation.#error( { status: false, messages } )
            return false
        }

        return true
    }


    static userParams( { userParams, schema, routeName } ) {
        const messages = []
        const { requiredUserParams, optionalUserParams } = Validation
            .#getAllowedUserParams( { schema, routeName } )
        const id = 'userParams'

        if( !userParams ) {
            messages.push( `${id}: Missing userParams` )
        } else if( typeof userParams !== 'object' ) {
            messages.push( `${id}: userParams must be an object` )
        }

        if( messages.length > 0 ) {
            Validation.#error( { status: false, messages } )
            return false
        }
        const allKeys = Object.keys( userParams )
        requiredUserParams
            .forEach( ( param ) => {
                const test = allKeys.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    messages.push( `${id}: Missing required userParam "${param}"` )
                }
            } )
        allKeys
            .forEach( ( param ) => {
                const test = optionalUserParams.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    messages.push( `${id}: Unknown userParam "${param}". Expected params are ${[ ...requiredUserParams, ...optionalUserParams ].join( ', ')}` )
                }
            } )

        return true
    }


    static #route( { routeName, schema } ) {
        const routeObj = schema['routes'][ routeName ]
        const id = `${routeName}`
        const messages = []

        const { types: { route: routeTypes } } = Validation
            .getTypes()
        const { status: s2, messages: m2 } = Validation
            .#testObject( { object: routeObj, types: routeTypes } )
       messages.push( ...m2 )
        if( !s2 ) { return messages }

        const { enums: { methods } } = Validation.getTypes()
        if( !methods.includes( routeObj['requestMethod'] ) ) {
            messages.push( `${id}.requestMethod: Unknown method (${routeObj['requestMethod']}), choose from ${methods.join( ', ' )}.` )
        }

        const { parameters } = routeObj
        parameters
            .forEach( ( item, index ) => {
                const s = `${id}.parameters.[${index}]`
                const { enums: { positions } } = Validation.getTypes()
                if( !positions.includes( item['position']['location'] ) ) {
                   messages.push( `${s}.location: Unknown location (${item['position']['location']}), choose from ${positions.join( ', ' )}.` )
                }

                if( item['position']['value'] !== '{{USER_PARAM}}' ) { return messages }
                if( !Object.hasOwn( item, 'z' ) ) {
                   messages.push( `Missing z for ${key} ${index}` )
                }

                const { types: { z: zTypes } } = Validation.getTypes()
                const { status: s5, messages: m5 } = Validation
                    .#testObject( { object: item['z'], types: zTypes } )
               messages.push( ...m5 )
                if( !s5 ) { return messages }

                const { enums: { primitives, options } } = Validation.getTypes()
                if( !primitives.map( a => a[ 0 ] ).includes( item['z']['primitive'] ) ) {
                   messages.push( `${s}.z.primitive: ${item['z']['primitive']}` )
                }
                const list = options.map( ( a ) => a[ 1 ] )
                item['z']['options']
                    .forEach( ( option, rindex ) => {
                        const ss = `${s}.z.options[${rindex}]`
                        if( !list.map( a => option.startsWith( a ) ).some( a => a ) ) {
                            messages.push( `${ss}: The option "${option}" is unknown. Choose from ${list.join( ', ')}` )
                        }

                        if( !list.map( a => a[ 0 ] ) ) {
                           messages.push( `${ss}: ${option}` )
                        }
                    } )
            } )
        if( messages.length > 0 ) { return messages }

        const { route } = routeObj
        const { regex: { versionNumber } } = Validation.getTypes()
        const findInserts = ( path ) => {
            const matches = path.match( versionNumber )
            return matches ? matches.map(p => p.slice(1)) : [];
        }

        const { enums: { positions } } = Validation.getTypes()
        findInserts( route )
            .forEach( ( name, index ) => {
                const s = `${id}.route.[${index}]`
                const result = parameters
                    .findIndex( ( a ) => {
                        const one = a['position']['location'] === positions[ 2 ]
                        const two = a['position']['key'] === name                    
                        return one && two
                    } )
                if( result === -1 ) {
                    messages.push( `${s}: Missing parameter ${name} in route` )
                }
            } )

        const { modifiers } = routeObj
        modifiers
            .forEach( ( item, index ) => {
                const id = `${routeName}.modifiers.[${index}]`
                const { types: { modifiers: modifierTypes } } = Validation.getTypes()
                const { status: s3, messages: m3 } = Validation
                    .#testObject( { object: item, types: modifierTypes } )
                messages.push( ...m3 )
                if( !s3 ) { return messages }
                const { enums: { phases } } = Validation.getTypes()
                if( !phases.includes( item['phase'] ) ) {
                   messages.push( `${id}.phase: Unknown phase (${item['phase']}), choose from ${phases.join( ', ' )}.` )
                }

                if( !Object.keys( schema['handlers'] ).includes( item['handler'] ) ) {
                    messages.push( `${id}.handler: Unknown handler (${item['handler']}), choose from ${Object.keys( schema['handlers'] ).join( ', ' )}.` )
                }
            } )

        const { tests } = routeObj
/*
        const { required, optional } = parameters
            .reduce( ( acc, item ) => {
                const { position: { key, value, location } } = item
                if( value === '{{USER_PARAM}}' ) {
                    const test = item['z']['options']
                        .map( a => a.startsWith( 'optional' ) )
                        .some( a => a ) 
                    if( test ) { acc['optional'].push( key ) }
                    else { acc['required'].push( key ) }
                }
                return acc
            }, { required: [], optional: [] } )
*/
        const { requiredUserParams, optionalUserParams } = Validation
            .#getAllowedUserParams( { schema, routeName } )

        tests
            .forEach( ( item, index ) => {
                const id = `${routeName}.tests.[${index}]`
                const userKeys = Object
                    .keys( item )
                    .filter( ( key ) => !key.startsWith( '_' ) )
                const metaKeys = Object
                    .keys( item )
                    .filter( ( key ) => key.startsWith( '_' ) )

                requiredUserParams
                    .forEach( ( r ) => {
                        if( !userKeys.includes( r ) ) {
                            messages.push( `${id}: Missing required parameter ${r}` )
                        }
                    } )

                userKeys
                    .forEach( ( key ) => {
                        const one = requiredUserParams.includes( key )
                        const two = optionalUserParams.includes( key )
                        if( !one && !two ) {
                            messages.push( `${id}: Unknown parameter ${key}` )
                        }
                    } )

                const { types: { tests } } = Validation.getTypes()
                const availableKeys = tests.map( ( a ) => a[ 0 ] )
                metaKeys
                    .forEach( ( key ) => {
                        if( !availableKeys.includes( key ) ) {
                            messages.push( `${id}: Unknown test ${key}` )
                        }
                    } ) 
            } )

        return messages
    }



    static #testObject( { object, types, strict=true } ) {
        const struct = {
            'status': false,
            'messages': []
        }

        const k = types.map( a => a[ 0 ] )
        Object
            .entries( object )
            .forEach( ( [ key, value ] ) => {
                if( strict ) {
                    if( !k.includes( key ) ) {
                        struct['messages'].push( `Unknown key: ${key}` )
                        return false
                    }
                }

                const typeIndex = types.findIndex( ( [ k ] ) => k === key )
                if( typeIndex === -1 ) {
                    struct['messages'].push( `Unknown key no type found: ${key}` )
                    return false
                }
                const expectedType = types[ typeIndex ][ 1 ]
                const { status, messages: m1 } =  Validation
                    .#validateValue( { key, value, expectedType } )
                struct['messages'].push( ...m1 )
            } )
        struct['status'] = struct['messages'].length === 0

        return struct
    }


    static #validateValue( { key, value, expectedType } ) {
        if( !value ) {
            return {
                status: false,
                messages: [ `Value for ${key} is undefined` ]
            }
        }

        const messages = []
        switch( expectedType ) {
            case 'string':
                if( typeof value !== 'string' ) {
                    messages.push( `Expected ${key} to be a string` )
                }
                break
            case 'arrayOfStrings':
                if( !Array.isArray( value ) ) {
                    messages.push( `Expected ${key} to be an array` )
                } else {
                    value.forEach( ( v ) => {
                        if( typeof v !== 'string' ) {
                            messages.push( `Expected ${key} to be an array of strings` )
                        }
                    } )
                }
                break
            case 'arrayOfObjects':
                if( !Array.isArray( value ) ) {
                    messages.push( `Expected ${key} to be an array` )
                } else {
                    value.forEach( ( v ) => {
                        if( typeof v !== 'object' || Array.isArray( v ) ) {
                            messages.push( `Expected ${key} to be an array of objects` )
                        }
                    } )
                }
                break
            case 'arrayOfArray':
                if( !Array.isArray( value ) ) {
                    messages.push( `Expected ${key} to be an array` )
                } else {
                    value.forEach( ( v ) => {
                        if( !Array.isArray( v ) ) {
                            messages.push( `Expected ${key} to be an array of arrays` )
                        }
                    } )
                }
                break
            case 'objectKeyValues':
                if( typeof value !== 'object' || Array.isArray( value ) ) {
                    messages.push( `Expected ${key} to be an object` )
                }
                break
            case 'objectOfObjects':
                if( typeof value !== 'object' || Array.isArray( value ) ) {
                    messages.push( `Expected ${key} to be an object` )
                }
                break
            case 'objectKeyFunctions':
                if( typeof value !== 'object' || Array.isArray( value ) ) {
                    messages.push( `Expected ${key} to be an object` )
                }
                break
            default:
                messages.push( `Unknown type: ${expectedType}` )
        }

        if( messages.length > 0 ) {
            return {
                status: false,
                messages
            }
        }

        return { status: true, messages }
    }


    static #getAllowedUserParams( { schema, routeName } ) {
        const { parameters } = schema['routes'][ routeName]
        const { requiredUserParams, optionalUserParams } = parameters
            .reduce( ( acc, item ) => {
                const { position: { key, value, location } } = item
                if( value === '{{USER_PARAM}}' ) {
                    const test = item['z']['options']
                        .map( a => a.startsWith( 'optionalUserParams' ) )
                        .some( a => a ) 
                    if( test ) { acc['optionalUserParams'].push( key ) }
                    else { acc['requiredUserParams'].push( key ) }
                }
                return acc
            }, { 'requiredUserParams': [], 'optionalUserParams': [] } )

        return { requiredUserParams, optionalUserParams }
    }


    static #getAllowedServerParams( { schema } ) {
        const { requiredFromParameters } = Object
            .entries( schema['routes'] )
            .reduce( ( acc, [ key, value ], index, arr ) => {
                const t = value['parameters']
                    .map( ( param ) => param['position']['value'] )
                    .filter( a => a.startsWith( '{{' ) )
                    .filter( a => a !== '{{USER_PARAM}}' )
                    .map( a => { 
                        a = a.replace( '{{', '' ).replace( '}}', '' ) 
                        return a
                    } )
                    .forEach( ( param ) => acc['requiredFromParameters'].add( param ) )

                return acc
            }, { 'requiredFromParameters': new Set() } )

        const { requiredFromHeaders } = Object
            .entries( schema['headers'] )
            .reduce( ( acc, [ key, value ], index, arr ) => {
                const t = value
                    .map( ( param ) => param['position']['value'] )
                    .filter( a => a.startsWith( '{{' ) )
                    .filter( a => !a === '{{USER_PARAM}}' )
                    .map( a => a.replace( '{{', '' ).replace( '}}', '' ) )
                    .forEach( ( param ) => acc['requiredFromHeaders'].add( param ) )

                return acc
            }, { 'requiredFromHeaders': new Set() } )

        const allowedServerParams = Array
            .from( new Set( [
                ...requiredFromParameters, 
                ...requiredFromHeaders
            ] ) )
            .sort( ( a, b ) => a.localeCompare( b ) )

        return { allowedServerParams }
    }


    static #error( { status, messages } ) {
        if( !status ) {
            const points = messages
                .map( ( m ) => { return `- ${m}` } )
                .join( `\n` )

            throw new Error( `\nValidation Error(s):\n${points}` )
        }
    }
}


export { Validation }