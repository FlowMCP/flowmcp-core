import { Validation } from './Validation.mjs'


class Interface {
    static from( { schema } ) {
        const { routes } = schema
        const zodSchemas = Object
            .entries( routes )
            .reduce( ( acc, [ key, value ] ) => {
                acc[ key ] = Interface
                    .toServerTool( { key, value } )
                return acc
            }, {} )

        return zodSchemas
    }


    static toServerTool( { schema, routeName } ) {
        const routeValue = schema['routes'][ routeName ]

        const toolName = routeName
            .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
            .toLowerCase()
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
        const item = Validation.getTypes()['enums']['primitives']
            .find( ( [ type ] ) => type === primitive )
        return item[ 1 ]
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