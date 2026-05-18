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

class IdResolver {
    static _VALID_TYPES = [ 'tool', 'resource', 'prompt', 'list', 'selection' ]
    static _NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/
    static _NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]*$/


    static parse( { id } ) {
        if( id === undefined || id === null || typeof id !== 'string' ) {
            return { namespace: null, type: null, name: null, error: 'ID must be a non-empty string' }
        }

        const trimmed = id.trim()

        if( trimmed.length === 0 ) {
            return { namespace: null, type: null, name: null, error: 'ID must be a non-empty string' }
        }

        const segments = trimmed.split( '/' )

        if( segments.length < 2 ) {
            return { namespace: null, type: null, name: null, error: 'ID001: ID must contain at least one "/" separator' }
        }

        if( segments.length === 2 ) {
            const [ namespace, name ] = segments

            return { namespace, type: null, name }
        }

        if( segments.length === 3 ) {
            const [ namespace, type, name ] = segments

            return { namespace, type, name }
        }

        return { namespace: null, type: null, name: null, error: 'ID contains too many "/" separators' }
    }


    static resolve( { id, registry } ) {
        const { namespace, type, name, error } = IdResolver.parse( { id } )

        if( error ) {
            return { namespace, type, name, resolved: false, filePath: null, error }
        }

        if( registry === undefined || registry === null || typeof registry !== 'object' ) {
            return { namespace, type, name, resolved: false, filePath: null, error: 'Registry must be a valid object' }
        }

        const namespaceEntry = IdResolver._findNamespace( { namespace, registry } )

        if( namespaceEntry === null ) {
            return { namespace, type, name, resolved: false, filePath: null, error: `Namespace "${namespace}" not found in registry` }
        }

        const { filePath, match } = IdResolver._findMatch( { namespace, type, name, namespaceEntry } )

        if( !match ) {
            const typeInfo = type !== null ? ` with type "${type}"` : ''

            return { namespace, type, name, resolved: false, filePath: null, error: `Name "${name}"${typeInfo} not found in namespace "${namespace}"` }
        }

        return { namespace, type: match.type, name, resolved: true, filePath }
    }


    static validate( { id } ) {
        const messages = []

        if( id === undefined || id === null || typeof id !== 'string' || id.trim().length === 0 ) {
            messages.push( 'ID001: ID must contain at least one "/" separator' )

            return { status: false, messages }
        }

        const trimmed = id.trim()
        const segments = trimmed.split( '/' )

        if( segments.length < 2 ) {
            messages.push( 'ID001: ID must contain at least one "/" separator' )

            return { status: false, messages }
        }

        if( segments.length === 2 ) {
            const [ namespace, name ] = segments
            IdResolver._validateNamespace( { namespace, messages } )
            IdResolver._validateName( { name, messages } )

            const status = messages.length === 0

            return { status, messages }
        }

        if( segments.length === 3 ) {
            const [ namespace, type, name ] = segments
            IdResolver._validateNamespace( { namespace, messages } )
            IdResolver._validateType( { type, messages } )
            IdResolver._validateName( { name, messages } )

            const status = messages.length === 0

            return { status, messages }
        }

        messages.push( 'ID contains too many "/" separators' )

        return { status: false, messages }
    }


    static _validateNamespace( { namespace, messages } ) {
        if( !IdResolver._NAMESPACE_PATTERN.test( namespace ) ) {
            messages.push( `ID002: Namespace "${namespace}" must match ^[a-z][a-z0-9-]*$` )
        }
    }


    static _validateType( { type, messages } ) {
        if( !IdResolver._VALID_TYPES.includes( type ) ) {
            messages.push( `ID003: ResourceType "${type}" must be one of: ${IdResolver._VALID_TYPES.join( ', ' )}` )
        }
    }


    static _validateName( { name, messages } ) {
        if( name.length === 0 ) {
            messages.push( 'ID004: Name must not be empty' )
        }
    }


    static _findNamespace( { namespace, registry } ) {
        const schemas = registry[ 'schemas' ] || {}
        const agents = registry[ 'agents' ] || {}

        if( schemas[ namespace ] !== undefined ) {
            return schemas[ namespace ]
        }

        if( agents[ namespace ] !== undefined ) {
            return agents[ namespace ]
        }

        return null
    }


    static _findMatch( { namespace, type, name, namespaceEntry } ) {
        const primitiveTypes = [ 'tools', 'resources', 'skills', 'lists', 'selections' ]
        const typeMap = {
            'tool': 'tools',
            'resource': 'resources',
            'prompt': 'skills',
            'list': 'lists',
            'selection': 'selections'
        }

        const reverseTypeMap = {
            'tools': 'tool',
            'resources': 'resource',
            'skills': 'prompt',
            'lists': 'list',
            'selections': 'selection'
        }

        if( type !== null ) {
            const pluralKey = typeMap[ type ]

            if( pluralKey === undefined ) {
                return { filePath: null, match: null }
            }

            const collection = namespaceEntry[ pluralKey ]

            if( collection === undefined || collection === null ) {
                return { filePath: null, match: null }
            }

            if( collection[ name ] !== undefined ) {
                const filePath = namespaceEntry[ 'filePath' ] || null

                return { filePath, match: { type } }
            }

            return { filePath: null, match: null }
        }

        const result = { filePath: null, match: null }

        primitiveTypes
            .forEach( ( pluralKey ) => {
                if( result.match !== null ) {
                    return
                }

                const collection = namespaceEntry[ pluralKey ]

                if( collection === undefined || collection === null ) {
                    return
                }

                if( collection[ name ] !== undefined ) {
                    const resolvedType = reverseTypeMap[ pluralKey ]
                    result.filePath = namespaceEntry[ 'filePath' ] || null
                    result.match = { type: resolvedType }
                }
            } )

        return result
    }
}


export { IdResolver }
