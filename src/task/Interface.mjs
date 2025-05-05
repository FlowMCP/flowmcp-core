import { Validation } from './Validation.mjs'
import { z } from 'zod'


class Interface {
    static from( { schema } ) {
        const { routes } = schema
        const zodSchemas = Object
            .entries( routes )
            .reduce( ( acc, [ routeName, _ ] ) => {
                acc[ routeName ] = Interface
                    .toServerTool( { schema, routeName } )
                    // .toServerTool( { key, value } )
                return acc
            }, {} )

        return zodSchemas
    }


    static toServerTool( { schema, routeName } ) {
        const { namespace } = schema
        const routeValue = schema['routes'][ routeName ]

        const routeNameSnakeCase = routeName
            .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
            .toLowerCase()
        const suffixSnakeCase = namespace
            .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
            .toLowerCase()
        let toolName = `${routeNameSnakeCase}_${suffixSnakeCase}`
        toolName = toolName
            .substring( 0, 63 )
            .replaceAll( ':', '' )
            .replaceAll( '-', '_' )
            .replaceAll( '/', '_' )

        const { description } = routeValue
        const zod = Interface
            .getZodSchema( { route: routeValue, key: routeName } )

        return { toolName, description, zod }
    }


    static getZodSchema( { route } ) {
        const { parameters } = route
        const zodSchema = parameters
            .filter( ( param ) => {
                if( !Object.hasOwn( param, 'z' ) ) { return false }
                if( param['z'].length === 0 ) { return false }
                return true
            } )
            .reduce( ( acc, param ) => {
                const { position: { key }, z: { primitive, options } } = param

                let _interface = Interface
                    .#insertPrimitive( { primitive } )
                _interface = Interface
                    .#insertOptions( { _interface, options } )

                acc[ key ] = _interface
                return acc
            }, {} )

        return zodSchema
    }


    static #insertPrimitive( { primitive } ) {
        function getContent( { str } ) {
            const start = str.indexOf( '(' )
            const end = str.lastIndexOf( ')' )
            let content = null

            if( start === -1 || end === -1 || end <= start ) {
                return { content }
            }
            content = str.slice( start + 1, end )
          
            return { content }
        }
          

        let [ primitiveName, zodPrimitive ]= Validation.getTypes()['enums']['primitives']
            .find( ( [ type, _ ] ) => primitive.startsWith( type ) )

        if( primitiveName.startsWith( 'enum' ) ) {
            // finde erstes ( von dort bis zum letzten )

            const { content } = getContent( { str: primitive } )
            if( content === null ) {
                throw new Error( `Invalid enum type: ${primitiveName}` )
            }
            const values = content
                .split( ',' )
                .map( ( item ) => item.trim() )
            zodPrimitive = z.enum( values )
        }

        return zodPrimitive
    }


    static #insertOptions( { _interface, options } ) {
        _interface = options
            .reduce( ( acc, option ) => {
                _interface = Interface
                    .#insertOption( { _interface, option } )
                return acc
            }, _interface  )

        return _interface
    }


    static #insertOption( { _interface, option } ) {
        const item = Validation
            .getTypes()['enums']['options']
            .find( ( [ prefix ] ) => option.startsWith( prefix ) )

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
            case 'enum':
                console.log( '_interface', _interface )
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
}


export { Interface }