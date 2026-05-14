const SEARCH_HINT_MAX_LENGTH = 100

export class MetaGenerator {

    /**
     * Generates heuristic meta values for a single tool.
     *
     * Returns starting values for manual author review — not authoritative.
     *
     * @param {Object} params
     * @param {Object} params.tool - A tool object from main.tools
     * @param {string} params.toolName - The key name of the tool
     * @returns {{ meta: { isReadOnly: boolean, isConcurrencySafe: boolean, isDestructive: boolean, searchHint: string, aliases: string[], alwaysLoad: boolean } }}
     */
    static generate( { tool, toolName: _toolName } ) {
        const isReadOnly = tool.method === 'GET'

        const description = typeof tool.description === 'string'
            ? tool.description
            : ''

        const searchHint = description.slice( 0, SEARCH_HINT_MAX_LENGTH )

        return {
            meta: {
                isReadOnly,
                isConcurrencySafe: isReadOnly,
                isDestructive: !isReadOnly,
                searchHint,
                aliases: [],
                alwaysLoad: false
            }
        }
    }

    /**
     * Generates heuristic meta values for all tools in a schema.
     *
     * @param {Object} params
     * @param {Object} params.schema - A v3/v4 schema object with a tools map
     * @returns {{ metaMap: Map<string, { isReadOnly: boolean, isConcurrencySafe: boolean, isDestructive: boolean, searchHint: string, aliases: string[], alwaysLoad: boolean }> }}
     */
    static generateForSchema( { schema } ) {
        const tools = schema.tools

        if( tools === undefined || tools === null || typeof tools !== 'object' ) {
            return { metaMap: new Map() }
        }

        const entries = Object
            .entries( tools )
            .map( ( [ toolName, tool ] ) => {
                const { meta } = MetaGenerator.generate( { tool, toolName } )
                return [ toolName, meta ]
            } )

        return { metaMap: new Map( entries ) }
    }

}
