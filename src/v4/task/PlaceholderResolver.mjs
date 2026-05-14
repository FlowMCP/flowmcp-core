const PLACEHOLDER_PATTERN = /\{\{([^}]+)\}\}/g

export class PlaceholderResolver {

    /**
     * Resolves all placeholder tokens in a content string.
     *
     * Resolution order: input → sharedList → prefill → tool/resource/prompt/skill
     * Unresolvable tokens are replaced with [ERROR: Token 'xyz' not found] — never throws.
     *
     * @param {Object} params
     * @param {string} params.content - The template string containing {{...}} tokens
     * @param {Object} params.catalog - The tool catalog { tools: Map, resources: Map, prompts: Map, skills: Map }
     * @param {Object} params.sharedLists - Key-value store for shared lists
     * @param {Object} params.inputs - User-provided input values { key: value }
     * @param {Map<string, string>} params.prefillResults - Results from PrefillExecutor
     * @returns {{ resolved: string }}
     */
    static resolve( { content, catalog, sharedLists, inputs, prefillResults } ) {
        const resolved = content.replace( PLACEHOLDER_PATTERN, ( _match, token ) => {
            return PlaceholderResolver._resolveToken( {
                token: token.trim(),
                catalog,
                sharedLists,
                inputs,
                prefillResults
            } )
        } )

        return { resolved }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    static _resolveToken( { token, catalog, sharedLists, inputs, prefillResults } ) {
        const parts = token.split( ':' )
        const type = parts[ 0 ]

        if( type === 'input' ) {
            return PlaceholderResolver._resolveInput( { parts, inputs } )
        }

        if( PlaceholderResolver._isSharedListToken( { type, sharedLists } ) ) {
            return PlaceholderResolver._resolveSharedList( { parts, sharedLists } )
        }

        if( type === 'prefill' ) {
            return PlaceholderResolver._resolvePrefill( { parts, prefillResults } )
        }

        if( type === 'tool' ) { return PlaceholderResolver._resolveTool( { parts, catalog } ) }
        if( type === 'resource' ) { return PlaceholderResolver._resolveResource( { parts, catalog } ) }
        if( type === 'prompt' ) { return PlaceholderResolver._resolvePrompt( { parts, catalog } ) }
        if( type === 'skill' ) { return PlaceholderResolver._resolveSkill( { parts, catalog } ) }

        return `[ERROR: Unknown token type '${type}']`
    }

    static _resolveInput( { parts, inputs } ) {
        const key = parts[ 1 ]
        if( key === undefined || key === '' ) { return `[ERROR: input token missing key]` }

        if( inputs === undefined || inputs === null ) { return `[ERROR: Token 'input:${key}' not found]` }

        const value = inputs[ key ]
        if( value === undefined ) { return `[ERROR: Token 'input:${key}' not found]` }

        return String( value )
    }

    static _isSharedListToken( { type, sharedLists } ) {
        if( sharedLists === undefined || sharedLists === null ) { return false }
        return Object.prototype.hasOwnProperty.call( sharedLists, type )
    }

    static _resolveSharedList( { parts, sharedLists } ) {
        const listName = parts[ 0 ]
        const alias = parts[ 1 ]
        if( alias === undefined || alias === '' ) { return `[ERROR: sharedList token '${listName}' missing alias]` }

        const list = sharedLists[ listName ]
        const value = list[ alias ]
        if( value === undefined ) { return `[ERROR: Token '${listName}:${alias}' not found in sharedLists]` }

        return String( value )
    }

    static _resolvePrefill( { parts, prefillResults } ) {
        const key = parts.slice( 1 ).join( ':' )
        if( key === '' ) { return `[ERROR: prefill token missing path]` }

        if( prefillResults === undefined || prefillResults === null || !prefillResults.has( key ) ) {
            return `[ERROR: Token 'prefill:${key}' not found]`
        }

        return prefillResults.get( key )
    }

    static _resolveTool( { parts, catalog } ) {
        const ref = parts[ 1 ]
        const selector = parts[ 2 ]

        if( ref === undefined || ref === '' ) { return `[ERROR: tool token missing reference]` }

        const tool = catalog !== undefined && catalog !== null && catalog.tools !== undefined && catalog.tools !== null
            ? catalog.tools.get( ref )
            : undefined
        if( tool === undefined ) { return `[ERROR: Token 'tool:${ref}' not found]` }

        if( selector === undefined || selector === '' ) { return PlaceholderResolver._formatToolFull( { ref, tool } ) }
        if( selector === 'description' ) {
            return tool.description !== undefined && tool.description !== null
                ? tool.description
                : `[ERROR: tool:${ref} has no description]`
        }
        if( selector === 'parameters' ) { return PlaceholderResolver._formatToolParameters( { tool } ) }
        if( selector === 'test' ) { return PlaceholderResolver._formatToolTest( { ref, tool } ) }
        if( selector === 'meta' ) { return PlaceholderResolver._formatToolMeta( { tool } ) }
        if( selector === 'call' ) { return PlaceholderResolver._formatToolCall( { ref, tool } ) }

        return `[ERROR: Unknown tool selector '${selector}']`
    }

    static _formatToolFull( { ref, tool } ) {
        const description = tool.description !== undefined && tool.description !== null
            ? tool.description
            : '_(no description)_'

        const lines = [
            `### ${ref}`,
            ``,
            description,
            ``,
            PlaceholderResolver._formatToolParameters( { tool } )
        ]
        return lines.join( '\n' )
    }

    static _formatToolParameters( { tool } ) {
        const params = tool.parameters
        if( params === undefined || params === null || Object.keys( params ).length === 0 ) {
            return '_No parameters_'
        }

        const header = `| Parameter | Type | Required | Description |`
        const divider = `|-----------|------|----------|-------------|`
        const rows = Object
            .entries( params )
            .map( ( [ key, def ] ) => {
                const required = def.required === true ? 'Yes' : 'No'
                const type = def.type !== undefined && def.type !== null ? def.type : '—'
                const desc = def.description !== undefined && def.description !== null ? def.description : '—'
                return `| ${key} | ${type} | ${required} | ${desc} |`
            } )

        return [ header, divider, ...rows ].join( '\n' )
    }

    static _formatToolTest( { ref, tool } ) {
        const tests = tool.tests
        if( tests === undefined || tests === null || tests.length === 0 ) {
            return `_No tests defined for ${ref}_`
        }

        const first = tests[ 0 ]
        return `\`\`\`json\n${JSON.stringify( first, null, 2 )}\n\`\`\``
    }

    static _formatToolMeta( { tool } ) {
        const meta = tool.meta
        if( meta === undefined || meta === null ) { return '_No meta defined_' }

        const formatFlag = ( value ) => {
            if( value === undefined || value === null ) { return '—' }
            return String( value )
        }

        const flags = [
            `isReadOnly: ${formatFlag( meta.isReadOnly )}`,
            `isConcurrencySafe: ${formatFlag( meta.isConcurrencySafe )}`,
            `isDestructive: ${formatFlag( meta.isDestructive )}`,
            `alwaysLoad: ${formatFlag( meta.alwaysLoad )}`
        ]
        return flags.join( ' | ' )
    }

    static _formatToolCall( { ref, tool } ) {
        const tests = tool.tests
        const hasExample = tests !== undefined && tests !== null && tests.length > 0
        const example = hasExample
            ? JSON.stringify( tests[ 0 ].params !== undefined && tests[ 0 ].params !== null ? tests[ 0 ].params : {} )
            : '{}'

        return `flowmcp call ${ref} '${example}'`
    }

    static _resolveResource( { parts, catalog } ) {
        const ref = parts[ 1 ]
        if( ref === undefined || ref === '' ) { return `[ERROR: resource token missing reference]` }

        const resource = catalog !== undefined && catalog !== null && catalog.resources !== undefined && catalog.resources !== null
            ? catalog.resources.get( ref )
            : undefined
        if( resource === undefined ) { return `[ERROR: Token 'resource:${ref}' not found]` }

        const description = resource.description !== undefined && resource.description !== null
            ? resource.description
            : '_(no description)_'

        return `**Resource:** ${ref}\n${description}`
    }

    static _resolvePrompt( { parts, catalog } ) {
        const ref = parts[ 1 ]
        if( ref === undefined || ref === '' ) { return `[ERROR: prompt token missing reference]` }

        const prompt = catalog !== undefined && catalog !== null && catalog.prompts !== undefined && catalog.prompts !== null
            ? catalog.prompts.get( ref )
            : undefined
        if( prompt === undefined ) { return `[ERROR: Token 'prompt:${ref}' not found]` }

        const description = prompt.description !== undefined && prompt.description !== null
            ? prompt.description
            : '_(no description)_'

        return `**Prompt:** ${ref}\n${description}`
    }

    static _resolveSkill( { parts, catalog } ) {
        const name = parts[ 1 ]
        if( name === undefined || name === '' ) { return `[ERROR: skill token missing name]` }

        const skill = catalog !== undefined && catalog !== null && catalog.skills !== undefined && catalog.skills !== null
            ? catalog.skills.get( name )
            : undefined
        if( skill === undefined ) { return `[ERROR: Token 'skill:${name}' not found]` }

        const description = skill.description !== undefined && skill.description !== null
            ? skill.description
            : '_(no description)_'

        return `**Skill:** ${name}\n${description}`
    }

}
