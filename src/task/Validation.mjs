import { z } from 'zod'


class Validation {
    static getTypes() {
        const types = {
            'version': '1.2',
            'types': {
                'meta': [
                    [ 'namespace',            'string'              ],
                    [ 'name',                 'string'              ],
                    [ 'description',          'string'              ],
                    [ 'docs',                 'arrayOfStrings'      ],
                    [ 'tags',                 'arrayOfStrings'      ],
                    // [ 'version',              'string'              ],
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
                    [ 'handlerName',          'string'              ]
                ]
            },
            'enums': {
                'methods':   [ 'GET',  'POST'             ],
                'positions': [ 'body', 'query',  'insert' ],
                // 'phases':    [ 'pre',  'post'             ],
                'phases': [ 'pre', 'execute', 'post' ],
                'primitives': [
                    [ 'string()',    z.string()     ],
                    [ 'number()',    z.number()     ],
                    [ 'boolean()',   z.boolean()    ],
                    [ 'object()',    z.object()     ],
                    [ 'enum(',       null           ],
                    [ 'array()',     z.array( z.string() ) ],
                ],
                'options': [
                    [ 'min(',      'min',      'float'   ],
                    [ 'max(',      'max',      'float'   ],
                    [ 'length(',   'length',   'int'     ],
                    // [ 'enum(',     'enum',     'string'  ],
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


    static schema( { schema, strict=true } ) {
        let id = 'schema'
        const struct = {
            'status': false,
            'messages': []
        }

        const { 
            version: flowMcpVersion,
            types: {
                meta: metaTypes,
            }
        } = Validation.getTypes()

        if( !schema ) {
            struct['messages'].push( `${id}: Missing schema` )
        } else if( typeof schema !== 'object' ) {
            struct['messages'].push( `${id}: schema must be an object` )
        }
        struct['status'] = struct['messages'].length === 0
        strict ? Validation.#error( struct ) : ''
        if( !struct['status'] ) { return struct }

        const { status: s1, messages: m1 } = Validation
            .#testObject( {  object: schema, types: metaTypes, id } )
        strict ? Validation.#error( { status: s1, messages: m1 } ) : ''
        if( !s1 ) { return { status: s1, messages: m1 } }

        const { namespace } = schema
        if( namespace == '' ) {
            struct['messages'].push( `${id}.namespace: Namespace is empty` )
        } else if( !/^[a-zA-Z]+$/.test( id ) ) {
            struct['messages'].push( `${id}.namespace: Namespace "${namespace}" is not valid. Must be a string with only letters` )
        } else {
            id = `Schema.${namespace}`
        }

        const isValidVersion = ( str ) => /^\d+\.\d+\.\d+$/.test( str )
        const { flowMCP } = schema
        if( !isValidVersion( flowMCP ) ) {
            struct['messages'].push( `${id}.flowMCP: ${flowMCP} is not valid. Must be in the format x.x.x` )
        } else if( !flowMCP.startsWith( flowMcpVersion ) ) {
            struct['messages'].push( `${id}.flowMCP: ${flowMCP} is not compatible with ${flowMcpVersion}.` )
        }

        const { root } = schema
        const isValidUrl = ( str ) => {
            try { new URL( str ); return true } catch { return false }
        }
        if( !isValidUrl( root ) ) {
            struct['messages'].push( `${id}.root: ${root} is not valid. Must be a valid URL` )
        }

        const { status: s2, messages: m2 } = Object
            .keys( schema['routes'] )
            .reduce( ( acc, routeName ) => {
                const messages = Validation.#route( { routeName, schema, id } )
                acc['messages'].push( ...messages )
                return acc
            }, { 'status': false, 'messages': [] } )
        struct['messages'].push( ...m2 )

        struct['status'] = struct['messages'].length === 0
        strict ? Validation.#error( struct ) : ''
        if( !struct['status'] ) { return struct }

        const { tags } = schema
        tags
            .map( ( tag, index ) => {
                if( typeof tag !== 'string' ) {
                    struct['messages'].push( `${id}.tags[${index}]: ${tag} is not valid. Must be a string` )
                    return false
                } else if( !/^[A-Za-z]+(\.(!)?[A-Za-z]+)?$/.test( tag ) ) {
                    struct['messages'].push( `${id}.tags[${index}]: ${tag} is not valid. Must be a string with only letters and dots` )
                    return false
                }
                const [ tagName, routeName ] = tag.split( '.' )
                if( !routeName ) { return true }
                const routeNames = Object
                    .keys( schema['routes'] )
                if( routeNames.findIndex( ( a ) => a === routeName.replace('!', '' ) ) === -1 ) {
                    struct['messages'].push( `${id}.tags[${index}]: ${tag} is not valid. "${routeName}" is not a valid routeName. Choose from ${routeNames.join(', ')}` )
                }
            } )

        const { requiredServerParams: schemaServerParams } = schema
        const { allowedServerParams } = Validation
            .#getAllowedServerParams( { schema } )
        allowedServerParams
            .forEach( ( param ) => {
                const test = schemaServerParams.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    struct['messages'].push( `${id}.requiredServerParams: Required "${param}" serverParam is missing.` )
                }
            } )
        schemaServerParams
            .forEach( ( param ) => {
                const test = allowedServerParams.findIndex( ( a ) => a === param )
                if( test === -1 ) {
                    struct['messages'].push( `${id}.requiredServerParams: Unknown "${param}" serverParam. Expected params are ${allowedServerParams.join( ', ')}` )
                }
            } )

        struct['status'] = struct['messages'].length === 0
        strict ? Validation.#error( struct ) : ''
        if( !struct['status'] ) { return struct }

        return struct
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

        Object
            .entries( serverParams )
            .forEach( ( [ key, value ] ) => {
                if( !value ) {
                    messages.push( `${id}: Value for ${key} is undefined` )
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


    static #route( { routeName, schema, id='' } ) {
        const routeObj = schema['routes'][ routeName ]
        id = `${id}.${routeName}`
        const messages = []

        const { types: { route: routeTypes } } = Validation
            .getTypes()
        const { status: s2, messages: m2 } = Validation
            .#testObject( { object: routeObj, types: routeTypes, id } )
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
                    .#testObject( { object: item['z'], types: zTypes, id } )

               messages.push( ...m5 )
                if( !s5 ) { return messages }

                const { enums: { primitives, options } } = Validation.getTypes()

                if( !primitives.map( a => item['z']['primitive'].startsWith( a[ 0 ] ) ).some( a => a ) ) {
                   messages.push( `${s}.z.primitive: ${item['z']['primitive']} is not known. Choose from ${primitives.map( a => a[ 0 ]).join(', ')} instead.` )
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
        const { requiredServerParams } = schema

        findInserts( route )
            .forEach( ( name, index ) => {
                const s = `${id}.route.[${index}]`
                const fromParameters = parameters
                    .findIndex( ( a ) => {
                        const one = a['position']['location'] === positions[ 2 ]
                        const two = a['position']['key'] === name                    
                        return one && two
                    } )
                const fromServerParams = requiredServerParams
                    .findIndex( ( a ) => a === name )
                if( fromParameters === -1 && fromServerParams === -1 ) {
                    messages.push( `${s}: Missing parameter ${name} in route` )
                }
            } )

        const { modifiers } = routeObj
        modifiers
            .forEach( ( item, index ) => {
                const id = `${routeName}.modifiers.[${index}]`
                const { types: { modifiers: modifierTypes } } = Validation.getTypes()
                const { status: s3, messages: m3 } = Validation
                    .#testObject( { object: item, types: modifierTypes, id, strict: true } )
                messages.push( ...m3 )
                if( !s3 ) { return messages }
                const { enums: { phases } } = Validation.getTypes()
                if( !phases.includes( item['phase'] ) ) {
                   messages.push( `${id}.phase: Unknown phase (${item['phase']}), choose from ${phases.join( ', ' )}.` )
                }

                const { handlerName } = item
                if( !Object.keys( schema['handlers'] ).includes( handlerName ) ) {
                    messages.push( `${id}.handler: Unknown handler (${handlerName}), choose from ${Object.keys( schema['handlers'] ).join( ', ' )}.` )
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

                        if( item[ key ] === undefined || item[ key ] === null ) {
                            messages.push( `${id}: Missing value for ${key}. key "${key}" is value of "${item[key]}"` )
                        }
                    } )

                const { types: { tests: _tests } } = Validation.getTypes()
                const availableKeys = _tests.map( ( a ) => a[ 0 ] )
                metaKeys
                    .forEach( ( key ) => {
                        if( !availableKeys.includes( key ) ) {
                            messages.push( `${id}: Unknown test ${key}` )
                        }
                    } ) 
            } )

        return messages
    }



    static #testObject( { object, types, id='', strict=true } ) {
        const struct = {
            'status': false,
            'messages': []
        }

        const requiredKeys = types.map( a => a[ 0 ] )
        requiredKeys
            .forEach( ( key ) => {
                if( !Object.hasOwn( object, key ) ) {
                    struct['messages'].push( `${id}: Missing required key: ${key}` )
                }
            }
        )
        if( struct['messages'].length > 0 ) { return struct }

        Object
            .entries( object )
            .forEach( ( [ key, value ] ) => {
                if( strict ) {
                    if( !requiredKeys.includes( key ) ) {
                        struct['messages'].push( `${id}: Unknown key: ${key}` )
                        return false
                    }
                }

                const typeIndex = types.findIndex( ( [ k ] ) => k === key )
                if( typeIndex === -1 ) {
                    struct['messages'].push( `${id}: Unknown key no type found: ${key}` )
                    return false
                }
                const expectedType = types[ typeIndex ][ 1 ]
                const { status, messages: m1 } =  Validation
                    .#validateValue( { key, value, expectedType, id } )
                struct['messages'].push( ...m1 )
            } )

        struct['status'] = struct['messages'].length === 0

        return struct
    }


    static #validateValue( { key, value, expectedType, id } ) {
        if( !value ) {
            return {
                status: false,
                messages: [ `${id}: Value for ${key} is undefined` ]
            }
        }

        const messages = []
        switch( expectedType ) {
            case 'string':
                if( typeof value !== 'string' ) {
                    messages.push( `${id}: Expected ${key} to be a string` )
                }
                break
            case 'arrayOfStrings':
                if( !Array.isArray( value ) ) {
                    messages.push( `${id}: Expected ${key} to be an array` )
                } else {
                    value.forEach( ( v ) => {
                        if( typeof v !== 'string' ) {
                            messages.push( `${id}: Expected ${key} to be an array of strings` )
                        }
                    } )
                }
                break
            case 'arrayOfObjects':
                if( !Array.isArray( value ) ) {
                    messages.push( `${id}: Expected ${key} to be an array` )
                } else {
                    value.forEach( ( v ) => {
                        if( typeof v !== 'object' || Array.isArray( v ) ) {
                            messages.push( `${id}: Expected ${key} to be an array of objects` )
                        }
                    } )
                }
                break
            case 'arrayOfArray':
                if( !Array.isArray( value ) ) {
                    messages.push( `${id}: Expected ${key} to be an array` )
                } else {
                    value.forEach( ( v ) => {
                        if( !Array.isArray( v ) ) {
                            messages.push( `${id}: Expected ${key} to be an array of arrays` )
                        }
                    } )
                }
                break
            case 'objectKeyValues':
                if( typeof value !== 'object' || Array.isArray( value ) ) {
                    messages.push( `${id}: Expected ${key} to be an object` )
                }
                break
            case 'objectOfObjects':
                if( typeof value !== 'object' || Array.isArray( value ) ) {
                    messages.push( `${id}: Expected ${key} to be an object` )
                }
                break
            case 'objectKeyFunctions':
                if( typeof value !== 'object' || Array.isArray( value ) ) {
                    messages.push( `${id}: Expected ${key} to be an object` )
                }
                break
            default:
                messages.push( `${id}: Unknown type: ${expectedType}` )
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
                        // .map( a => a.startsWith( 'optionalUserParams' ) )
                        .map( a => a.startsWith( 'optional' ) )
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
                if( typeof value !== 'string' ) { return acc }
                const matches = [ ...value.matchAll( /{{(.*?)}}/g ) ]
                const contents = matches
                    .map( m => m[ 1 ] )
                    .forEach( ( param ) => acc['requiredFromHeaders'].add( param ) )

                return acc
            }, { 'requiredFromHeaders': new Set() } )

        const { root } = schema
        const matches = [ ...root.matchAll( /{{(.*?)}}/g ) ]
        const { requiredFromUrl } = matches
            .reduce( ( acc, param ) => {
                acc['requiredFromUrl'].add( param[ 1 ]  )
                return acc
            },  { 'requiredFromUrl': new Set() } )
    
        const allowedServerParams = Array
            .from( new Set( [
                ...requiredFromParameters, 
                ...requiredFromHeaders,
                ...requiredFromUrl
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