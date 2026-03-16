import { z } from 'zod'


class ZodBuilder {
    static getZodSchema( { route } ) {
        const { parameters } = route
        const zodSchema = parameters
            .filter( ( param ) => {
                if( !Object.hasOwn( param, 'z' ) ) { return false }
                const zDef = param[ 'z' ]
                if( !zDef[ 'primitive' ] ) { return false }

                return true
            } )
            .reduce( ( acc, param ) => {
                const { position: { key }, z: { primitive, options } } = param
                let _interface = ZodBuilder
                    .#insertPrimitive( { primitive } )
                _interface = ZodBuilder
                    .#insertOptions( { _interface, 'options': options || [] } )
                acc[ key ] = _interface

                return acc
            }, {} )

        return zodSchema
    }


    static #insertPrimitive( { primitive } ) {
        const primitives = [
            [ 'string()',  z.string()                ],
            [ 'number()',  z.number()                 ],
            [ 'boolean()', z.boolean()                ],
            [ 'object()',  z.object( {} )             ],
            [ 'enum(',     null                       ],
            [ 'array()',   z.array( z.string() )      ]
        ]

        const match = primitives
            .find( ( [ type ] ) => primitive.startsWith( type ) )

        if( !match ) {
            return z.string()
        }

        const [ primitiveName, zodPrimitive ] = match

        if( primitiveName.startsWith( 'enum' ) ) {
            const start = primitive.indexOf( '(' )
            const end = primitive.lastIndexOf( ')' )

            if( start === -1 || end === -1 || end <= start ) {
                throw new Error( `Invalid enum type: ${primitive}` )
            }

            const content = primitive.slice( start + 1, end )
            const values = content
                .split( ',' )
                .map( ( item ) => item.trim() )

            return z.enum( values )
        }

        return zodPrimitive
    }


    static #insertOptions( { _interface, options } ) {
        const result = options
            .reduce( ( acc, option ) => {
                const updated = ZodBuilder
                    .#insertOption( { '_interface': acc, option } )

                return updated
            }, _interface )

        return result
    }


    static #insertOption( { _interface, option } ) {
        const optionTypes = [
            [ 'min(',      'min',      'float'   ],
            [ 'max(',      'max',      'float'   ],
            [ 'length(',   'length',   'int'     ],
            [ 'regex(',    'regex',    'string'  ],
            [ 'optional(', 'optional', 'empty'   ],
            [ 'default(',  'default',  'string'  ]
        ]

        const item = optionTypes
            .find( ( [ prefix ] ) => option.startsWith( prefix ) )

        if( !item ) {
            return _interface
        }

        const [ , zType, primitives ] = item
        let value = null

        switch( primitives ) {
            case 'float':
                value = parseFloat( option.slice( zType.length + 1, -1 ) )
                break
            case 'integer':
            case 'int':
                value = parseInt( option.slice( zType.length + 1, -1 ) )
                break
            case 'string':
                value = option.slice( zType.length + 1, -1 )
                break
            case 'boolean':
                value = option.slice( zType.length + 1, -1 ) === 'true'
                break
            case 'array':
                value = option.slice( zType.length + 1, -1 )
                    .split( ',' )
                    .map( ( item ) => item.trim() )
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
}


export { ZodBuilder }
