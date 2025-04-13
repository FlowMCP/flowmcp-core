import { Interface } from "../task/Interface.mjs"


class Validation {
    static schema( { schema } ) {
        const { status: s1, messages: m1 } = Validation
            .#test( {
                'tests': [
                    [ 'root',      'string'              ],
                    [ 'vars',      'arrayOfStrings'      ],
                    [ 'headers',   'objectKeyValues'     ],
                    [ 'routes',    'objectOfObjects'     ],
                    [ 'modifiers', 'objectKeyFunctions'  ]
                ],
                'obj': schema,
                'prefix': ''
            } )
        if( !s1 ) {
            throw new Error( `\nValidation failed: \n${m1.join( "\n" )}` )
        }

        const options = Interface
            .getTypes()['options']
            .map( a => a[ 1 ] )
        const primitives = Interface
            .getTypes()['primitives']
            .map( a => a[ 0 ] )

        const messages = []
        Object
            .entries( schema['routes'] )
            .forEach( ( [ key, route ] ) => {
                const { status: s2, messages: m2 } = Validation
                    .#test( {
                        'tests': [
                            [ 'requestMethod', 'string'         ],
                            [ 'description',   'string'         ],
                            [ 'route',         'string'         ],
                            [ 'parameters',    'arrayOfObjects' ],
                            [ 'tests',         'arrayOfObjects' ],
                            [ 'modifiers',     'arrayOfArray'   ]
                        ],
                        'obj': route,
                        'prefix': `routes.${key}: `
                    } )

                messages.push( ...m2 )
                if( !s2 ) { return }

                route['parameters']
                    .forEach( ( param, index ) => {
                        const { status: s3, messages: m3 } = Validation
                            .#test( {
                                'tests': [
                                    [ 'position', 'arrayOfStrings' ],
                                    [ 'z',        'arrayOfStrings' ]
                                ],
                                'obj': param,
                                'prefix': `routes.${key}.parameters[${index}]: `
                            } )
                        messages.push( ...m3 )
                        if( !s3 ) { return }

                        if( param['position'].length !== 3 ) {
                            messages.push( `routes.${key}.parameters[${index}].position: Expected position to be an array of length 3` )
                        }

                        if( !Interface.getTypes()['positions'].includes( param['position'][ 2 ] ) ) {
                            messages.push( `routes.${key}.parameters[${index}].position[ 2 ]: Expected position to be one of ${Interface.getTypes()['positions'].join( ', ' )}` )
                        }

                        param['z']
                            .forEach( ( str, index ) => {
                                if( index === 0 ) {
                                    if( !primitives.includes( str ) ) {
                                        messages.push( `routes.${key}.parameters[${index}].z[${index}]: Unknown type: "${str}". Choose from: ${primitives.join(', ')}` )
                                    }
                                    return true
                                }


                                if( !options.map( a => str.startsWith( a ) ).some( a => a ) ) {
                                    messages.push( `routes.${key}.parameters[${index}].z[${index}]: Unknown type: "${str}". Choose from: ${options.join(', ')}` )
                                }
                            } )
                    } )

                route['tests']
                    .forEach( ( test, index ) => {
                        const { status: s4, messages: m4 } = Validation
                            .#test( {
                                'tests': [
                                    [ '_description', 'string' ]
                                ],
                                'obj': test,
                                'prefix': `routes.${key}.tests[${index}]: `
                            } )
                        messages.push( ...m4 )
                    } )

                route['modifiers']
                    .forEach( ( modifier, index ) => {
                        if( modifier.length !== 2 ) {
                            messages.push( `routes.${key}.modifiers[${index}]: Expected modifier to be an array of length 2` )
                        }
                        const [ position, modifierName ] = modifier
                        if( !Object.hasOwn( schema['modifiers'], modifierName ) ) {
                            messages.push( `routes.${key}.modifiers[${index}]: Modifier ${modifierName} does not exist` )
                        }

                        const positions = [ 'post', 'pre' ]
                        if( !positions.includes( position ) ) {
                            messages.push( `routes.${key}.modifiers[${index}]: Expected position to be one of ${positions.join( ', ' )}` )
                        }
                    } )
            } )

        if( messages.length !== 0 ) {
            throw new Error( `\nValidation failed: \n${messages.join( "\n" )}` )
        }

        return true
    }

    static serverParams( { serverParams } ) {
        const messages = []
        if( !serverParams ) {
            messages.push( `- serverParams is undefined` )
        } else if( typeof serverParams !== 'object' || Array.isArray( serverParams ) ) {
            messages.push( `- serverParams is not an object` )
        } 

        if( messages.length > 0 ) {
            throw new Error( `\nValidation failed: \n${messages.join( "\n" )}` )    
        }

        Object
            .entries( serverParams )
            .forEach( ( [ key, value ] ) => {
                if( value === undefined ) {
                    messages.push( `- serverParams.${key} is undefined` )
                }
            } )
        if( messages.length > 0 ) {
            throw new Error( `\nValidation failed: \n${messages.join( "\n" )}` )    
        }
    
    }


    static userParams( { userParams } ) {
        const messages = []
        if( !userParams ) {
            messages.push( `- userParams is undefined` )
        }
        if( typeof userParams !== 'object' || Array.isArray( userParams ) ) {
            messages.push( `- userParams is not an object` )
        }
        if( messages.length > 0 ) {
            throw new Error( `\nValidation failed: \n${messages.join( "\n" )}` )    
        }

        Object
            .entries( userParams )
            .forEach( ( [ key, value ] ) => {
                if( value === undefined ) {
                    messages.push( `- userParams.${key} is undefined` )
                }
            } )
        if( messages.length > 0 ) {
            throw new Error( `\nValidation failed: \n${messages.join( "\n" )}` )
        }
    }


    static #test( { tests, obj, prefix } ) {
        const messages = []
        const v = tests
            .map( ( a ) => {
                const [ key, __ ] = a
                a.push( obj[ key ]  )
                return a
            } )
            .forEach( ( [ key, expectedType, value ] ) => {
                const { status, messages: m } = Validation
                    .#validateValue( { key, value, expectedType } )
                const mm = m.map( ( a ) => {
                    return `- ${prefix}${key} ${a}`
                } )

                !status ? messages.push( ...mm ) : null
            } )
        const status = messages.length === 0

        return { status, messages }
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
}

export { Validation }