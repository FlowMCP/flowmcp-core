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


    // Memo 152 / PRD-018 (D-07) — the CLI spec-id grammar moved here. It is a
    // Spec concern (namespace/tool/name + optional "<source>:" prefix reach into
    // the MCP tool name), not CLI-private logic. Distinct from parse() above:
    // this carries the "<source>:" coordinate, the 'namespace'/'schema' levels
    // and the per-test "<ns>/tool/<name>/tests/<N>" selector. No silent default —
    // every malformed form is a hard { valid:false, error } (kept verbatim from
    // the CLI so existing CLI collision/parse suites stay byte-compatible).
    static parseSpecId( { specId } ) {
        if( typeof specId !== 'string' || specId.length === 0 ) {
            return { 'valid': false, 'error': 'Spec-ID must be a non-empty string' }
        }

        let source = null
        let rest = specId
        const colonIndex = specId.indexOf( ':' )
        if( colonIndex !== -1 ) {
            source = specId.slice( 0, colonIndex )
            rest = specId.slice( colonIndex + 1 )

            if( source.length === 0 ) {
                return { 'valid': false, 'error': `Invalid source coordinate in "${specId}": the prefix before ":" must be a schemaFolders[] name.` }
            }

            if( rest.length === 0 ) {
                return { 'valid': false, 'error': `Invalid Spec-ID "${specId}": nothing after the "${source}:" source prefix. Expected "${source}:<namespace>[/tool/name]".` }
            }
        }

        const parts = rest.split( '/' )
        const slashCount = parts.length - 1

        if( slashCount === 0 ) {
            const [ namespace ] = parts
            const namespaceValid = /^[a-z][a-z0-9-]*$/.test( namespace )

            if( namespaceValid === false ) {
                return { 'valid': false, 'error': `Invalid namespace "${namespace}": expected a lowercase identifier matching ^[a-z][a-z0-9-]*$ (e.g. "etherscan").` }
            }

            return { 'valid': true, source, namespace, 'type': 'namespace' }
        }

        if( slashCount === 1 ) {
            const [ namespace, name ] = parts

            return { 'valid': true, source, namespace, 'type': 'schema', name }
        }

        if( slashCount === 2 ) {
            const [ namespace, type, name ] = parts
            const allowedTypes = [ 'tool', 'resource', 'prompt', 'skill', 'selection', 'agent' ]
            const isAllowed = allowedTypes
                .find( ( t ) => {
                    const matches = t === type

                    return matches
                } )

            if( !isAllowed ) {
                return { 'valid': false, 'error': `Unknown Spec-ID type "${type}": expected one of tool|resource|prompt|skill|selection|agent. Example: "${namespace}/tool/${name || 'someRoute'}".` }
            }

            return { 'valid': true, source, namespace, type, name }
        }

        if( slashCount === 4 ) {
            const [ namespace, kind, name, sub, indexRaw ] = parts
            if( kind !== 'tool' || sub !== 'tests' ) {
                return { 'valid': false, 'error': `Invalid per-test Spec-ID "${specId}": expected "<namespace>/tool/<name>/tests/<N>".` }
            }
            if( /^[1-9][0-9]*$/.test( indexRaw ) === false ) {
                return { 'valid': false, 'error': `Invalid test index "${indexRaw}" in "${specId}": expected a positive 1-based integer.` }
            }

            return { 'valid': true, source, namespace, 'type': 'test', name, 'testIndex': Number( indexRaw ) }
        }

        return {
            'valid': false,
            'error': `Invalid Spec-ID format: "${specId}". Valid forms: "<namespace>" (whole provider), "<namespace>/<schema-name>" (1 slash = schema), "<namespace>/tool/<name>" (2 slashes = tool), "<namespace>/tool/<name>/tests/<N>" (4 slashes = one test). Optional "<source>:" prefix. Example: "etherscan/tool/getBalance".`
        }
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
