const VARIANTS = [ 'full', 'parameters', 'test', 'call', 'meta' ]


export class SkillContentGenerator {

    /**
     * Generates a content map of placeholder-token -> generated text.
     * For each tool in the supplied schemas, emits 5 entries (full + 4 variants).
     *
     * @param {Object} params
     * @param {Array<Object>} params.schemas - Array of v4 schema objects (each with namespace + tools)
     * @param {Object} [params.sharedLists] - Shared lists for enum resolution (optional)
     * @returns {{ contentMap: Map<string, string> }}
     */
    static generate( { schemas, sharedLists } ) {
        if( !Array.isArray( schemas ) ) {
            throw new Error( 'SkillContentGenerator.generate: schemas must be an array' )
        }

        const sharedListsResolved = sharedLists === undefined
            ? {}
            : sharedLists

        const contentMap = new Map()

        schemas
            .forEach( ( schema ) => {
                SkillContentGenerator
                    ._addEntriesForSchema( { schema, sharedLists: sharedListsResolved, contentMap } )
            } )

        return { contentMap }
    }

    // --- Private Helpers ------------------------------------------------------

    static _addEntriesForSchema( { schema, sharedLists, contentMap } ) {
        const namespace = schema !== undefined && schema !== null
            ? schema.namespace
            : undefined
        const tools = schema !== undefined && schema !== null
            ? schema.tools
            : undefined

        if( typeof namespace !== 'string' || namespace.length === 0 ) {
            return
        }

        if( tools === undefined || tools === null || typeof tools !== 'object' ) {
            return
        }

        Object
            .entries( tools )
            .forEach( ( [ toolName, tool ] ) => {
                VARIANTS
                    .forEach( ( variant ) => {
                        const token = SkillContentGenerator
                            ._formatToken( { namespace, toolName, variant } )
                        const content = SkillContentGenerator
                            ._renderVariant( { namespace, toolName, tool, sharedLists, variant } )
                        contentMap.set( token, content )
                    } )
            } )
    }


    static _formatToken( { namespace, toolName, variant } ) {
        if( variant === 'full' ) {
            return `{{tool:${namespace}/${toolName}}}`
        }
        return `{{tool:${namespace}/${toolName}:${variant}}}`
    }


    static _renderVariant( { namespace, toolName, tool, sharedLists, variant } ) {
        if( variant === 'full' ) {
            return SkillContentGenerator._renderFull( { namespace, toolName, tool, sharedLists } )
        }
        if( variant === 'parameters' ) {
            return SkillContentGenerator._renderParameters( { tool, sharedLists } )
        }
        if( variant === 'test' ) {
            return SkillContentGenerator._renderTest( { tool } )
        }
        if( variant === 'call' ) {
            return SkillContentGenerator._renderCall( { namespace, toolName, tool } )
        }
        if( variant === 'meta' ) {
            return SkillContentGenerator._renderMeta( { tool } )
        }
        throw new Error( `SkillContentGenerator: unknown variant '${variant}'` )
    }


    static _renderFull( { namespace, toolName, tool, sharedLists } ) {
        const description = typeof tool.description === 'string'
            ? tool.description
            : ''
        const params = SkillContentGenerator._renderParameters( { tool, sharedLists } )
        const call = SkillContentGenerator._renderCall( { namespace, toolName, tool } )

        const block = [
            `### ${namespace}/${toolName}`,
            '',
            description,
            '',
            params,
            '',
            'Example call:',
            '',
            call
        ].join( '\n' )

        return block
    }


    static _renderParameters( { tool, sharedLists: _sharedLists } ) {
        const parameters = Array.isArray( tool.parameters )
            ? tool.parameters
            : []

        if( parameters.length === 0 ) {
            return '_No parameters._'
        }

        const header = '| Key | Type | Required | Description |\n|-----|------|----------|-------------|'

        const rows = parameters
            .map( ( param ) => {
                const key = param.position !== undefined && param.position !== null && typeof param.position.key === 'string'
                    ? param.position.key
                    : ''
                const type = param.z !== undefined && param.z !== null && typeof param.z.primitive === 'string'
                    ? param.z.primitive
                    : ''
                const hasOptions = param.z !== undefined && param.z !== null && Array.isArray( param.z.options )
                const isOptional = hasOptions
                    ? param.z.options.some( ( o ) => typeof o === 'string' && o.startsWith( 'optional(' ) )
                    : false
                const required = isOptional ? 'no' : 'yes'
                const description = typeof param.description === 'string'
                    ? param.description
                    : ''
                return `| ${key} | ${type} | ${required} | ${description} |`
            } )
            .join( '\n' )

        return `${header}\n${rows}`
    }


    static _renderTest( { tool } ) {
        const tests = Array.isArray( tool.tests )
            ? tool.tests
            : []

        if( tests.length === 0 ) {
            return '_No test example available._'
        }

        const first = tests[ 0 ]
        const formatted = JSON.stringify( first, null, 2 )
        return `\`\`\`json\n${formatted}\n\`\`\``
    }


    static _renderCall( { namespace, toolName, tool } ) {
        const tests = Array.isArray( tool.tests )
            ? tool.tests
            : []
        const hasExample = tests.length > 0
            && tests[ 0 ] !== undefined
            && tests[ 0 ] !== null
            && tests[ 0 ].params !== undefined
            && tests[ 0 ].params !== null
        const exampleParams = hasExample
            ? tests[ 0 ].params
            : {}
        const paramsJson = JSON.stringify( exampleParams )
        return `flowmcp call ${namespace}/${toolName} '${paramsJson}'`
    }


    static _renderMeta( { tool } ) {
        const meta = tool !== undefined && tool !== null && tool.meta !== undefined && tool.meta !== null
            ? tool.meta
            : {}
        const isReadOnly = meta.isReadOnly === undefined
            ? 'unknown'
            : String( meta.isReadOnly )
        const alwaysLoad = meta.alwaysLoad === undefined
            ? 'unknown'
            : String( meta.alwaysLoad )
        const searchHint = typeof meta.searchHint === 'string'
            ? meta.searchHint
            : ''
        return `isReadOnly: ${isReadOnly} | alwaysLoad: ${alwaysLoad} | searchHint: ${searchHint}`
    }

}
