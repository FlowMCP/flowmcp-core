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
        // Memo 152 / PRD-028 (A-15 serve smoke) — apply base-type CONSTRAINTS (min/max/length/regex)
        // BEFORE the WRAPPERS (optional, then default), regardless of the order the schema declares
        // them in. `.optional()` / `.default()` return ZodOptional / ZodDefault wrappers that do NOT
        // expose `.min` / `.max` / `.length` / `.regex`, so applying a constraint after a wrapper
        // throws "_interface.max is not a function" and the tool cannot register in `flowmcp run`.
        // The schemas pervasively declare options as ['optional()','default(N)','min(0)','max(100)'];
        // a stable priority sort turns that into z.number().min(0).max(100).optional().default(N) —
        // the valid Zod chain — without changing already-valid orderings.
        const ordered = ZodBuilder.#orderOptions( { options } )
        const result = ordered
            .reduce( ( acc, option ) => {
                const updated = ZodBuilder
                    .#insertOption( { '_interface': acc, option } )

                return updated
            }, _interface )

        return result
    }


    static #orderOptions( { options } ) {
        // Stable sort by wrapping priority: constraints (0) -> optional (1) -> default (2). A stable
        // sort preserves declaration order within the same priority (e.g. min before max).
        const priorityOf = ( option ) => {
            if( option.startsWith( 'optional(' ) ) { return 1 }
            if( option.startsWith( 'default(' ) ) { return 2 }

            return 0
        }

        const ordered = options
            .map( ( option, index ) => ( { option, index, priority: priorityOf( option ) } ) )
            .sort( ( a, b ) => a.priority - b.priority || a.index - b.index )
            .map( ( entry ) => entry[ 'option' ] )

        return ordered
    }


    static #insertOption( { _interface, option } ) {
        const optionTypes = [
            [ 'min(',      'min',      'float'                                                                                          ],
            [ 'max(',      'max',      'float'                                                                                          ],
            [ 'length(',   'length',   'int'                                                                                            ],
            [ 'regex(',    'regex',    'string'                                                                                         ],
            [ 'optional(', 'optional', 'empty'                                                                                          ],
            [ 'default(',  'default',  ( v ) => typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string'        ]
        ]

        const item = optionTypes
            .find( ( [ prefix ] ) => option.startsWith( prefix ) )

        if( !item ) {
            return _interface
        }

        const [ , zType, primitivesEntry ] = item

        let primitives = primitivesEntry
        if( typeof primitivesEntry === 'function' ) {
            const rawValue = option.slice( zType.length + 1, -1 )
            const parsedNumber = Number( rawValue )
            const isNumeric = rawValue.trim().length > 0 && !Number.isNaN( parsedNumber )
            const isBoolean = rawValue === 'true' || rawValue === 'false'
            const detected = isNumeric
                ? parsedNumber
                : isBoolean
                    ? ( rawValue === 'true' )
                    : rawValue
            primitives = primitivesEntry( detected )
        }

        let value = null

        switch( primitives ) {
            case 'float':
                value = parseFloat( option.slice( zType.length + 1, -1 ) )
                break
            case 'integer':
            case 'int':
                value = parseInt( option.slice( zType.length + 1, -1 ) )
                break
            case 'number':
                value = Number( option.slice( zType.length + 1, -1 ) )
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
