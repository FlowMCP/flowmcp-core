import { z } from 'zod'


class Interface {
    static from( { schema } ) {
        const { routes } = schema
        const zodSchemas = Object
            .entries( routes )
            .reduce( ( acc, [ key, route ] ) => {
                const zodSchema = Interface
                    .getZodSchema( { route, key } )
                acc[ key ] = zodSchema
                return acc
            }, {} )

        return zodSchemas
    }


    static getTypes() {
        const types = {
            'positions': [ 'body', 'query', 'insert' ],
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
        }

        return types
    }


    static #insertPrimitive( { primitive } ) {
        const item = Interface
            .getTypes()['primitives']
            .find( ( [ type ] ) => type === primitive )

        if( !item ) {
            throw new Error( `Unsupported zod type: ${primitive}` )
        }

        return item[ 1 ]
    }


    static #insertOptions( { _interface, z } ) {
        _interface = z
            .filter( ( _, index ) => index !== 0 )
            .reduce( ( acc, option ) => {
                _interface = Interface
                    .#insertOption( { _interface, option } )
                return acc
            }, _interface  )

        return _interface
    }


    static #insertOption( { _interface, option } ) {
        const item = Interface
            .getTypes()['options']
            .find( ( [ prefix ] ) => option.startsWith( prefix ) )

        if( !item ) {
            throw new Error( `Unsupported zod type: ${option}` )
        }

        const [ _, zType, primitives ] = item
        let value = null
        switch( primitives ) {
            case 'float':
                value = parseFloat( option.slice( zType.length + 1, -1 ) )
                break
            case 'integer':
                value = parseInt( option.slice( zType.length + 1, -1 ) )
                break
            case 'string':
                value = option.slice( zType.length + 1, -1 )
                break
            case 'boolean':
                value = option.slice( zType.length + 1, -1 ) === 'true'
                break
            case 'empty':
                value = null
                break
            default:
                throw new Error( `Unsupported zod type: ${primitives}` )
        }

        switch( zType ) {
            case 'min':
                _interface = _interface.min( value )
                break
            case 'max':
                _interface = _interface.max( value )
                break
            case 'length':
                _interface = _interface.length( value )
                break
            case 'enum':
                _interface = _interface.enum( value )
                break
            case 'regex':
                _interface = _interface.regex( new RegExp( value ) )
                break
            case 'optional':
                _interface = _interface.optional()
                break
            case 'default':
                _interface = _interface.default( value )
                break
            default:
                throw new Error( `Unsupported zod type: ${zType}` )
        }

        return _interface
    }


    static getZodSchema( { route } ) {
        const { parameters } = route
        const zodSchema = parameters
            .filter( ( param ) => {
                if( !Object.hasOwn( param, 'z' ) ) { return false }
                if( param['z'].length === 0 ) { return false }
                return true
            } )
            .reduce( ( acc, a, index, arr ) => {
                const { position, z } = a

                let _interface = Interface
                    .#insertPrimitive( { primitive: z[ 0 ] } )
                _interface = Interface
                    .#insertOptions( { _interface, z } )

                acc[ position[ 0 ] ] = _interface
                return acc
            }, {} )

        return zodSchema
    }
}


export { Interface }

