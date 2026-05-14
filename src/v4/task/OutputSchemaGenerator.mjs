const NUMBER_HINTS = [
    'price', 'amount', 'balance', 'cap', 'volume', 'count',
    'total', 'fee', 'rate', 'supply', 'value', 'size',
    'height', 'width', 'index', 'number', 'timestamp',
    'decimals', 'market_cap', 'marketCap'
]

const BOOLEAN_HINTS = [
    'is', 'has', 'can', 'should', 'enabled', 'active',
    'verified', 'valid', 'visible', 'hidden', 'frozen'
]

const MAX_DEPTH = 4
const DEFAULT_MIME_TYPE = 'application/json'


export class OutputSchemaGenerator {

    /**
     * Capture-Flow: generates output schema + suggested file name for the captured response.
     * Core does NOT write the file — CLI persists the response.
     *
     * @param {Object} params
     * @param {*} params.response - The raw API response value
     * @param {string} [params.mimeType] - e.g. 'application/json'
     * @param {string} params.schemaId - Schema-File-ID (1 slash, e.g. 'etherscan-io/contracts')
     * @returns {{ output: { mimeType: string, schema: Object }, suggestedFileName: string }}
     */
    static generateFromResponse( { response, mimeType, schemaId } ) {
        if( typeof schemaId !== 'string' || schemaId.length === 0 ) {
            throw new Error( 'OutputSchemaGenerator.generateFromResponse: schemaId must be a non-empty string' )
        }

        const slashMatches = schemaId.match( /\//g )
        const slashCount = slashMatches !== null
            ? slashMatches.length
            : 0

        if( slashCount !== 1 ) {
            throw new Error( `OutputSchemaGenerator.generateFromResponse: schemaId must be Schema-File-ID (1 slash), got '${schemaId}' with ${slashCount} slashes` )
        }

        const resolvedMimeType = typeof mimeType === 'string'
            ? mimeType
            : DEFAULT_MIME_TYPE

        const schema = OutputSchemaGenerator
            ._analyzeValue( { value: response, depth: 1 } )

        const output = { mimeType: resolvedMimeType, schema }

        const datePart = new Date().toISOString().slice( 0, 10 )
        const suggestedFileName = OutputSchemaGenerator
            ._formatCaptureFileName( { schemaId, datePart } )

        return { output, suggestedFileName }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    static _formatCaptureFileName( { schemaId, datePart } ) {
        const normalized = schemaId.replace( /\//g, '_' )
        const fileName = `${normalized}-capture-${datePart}.json`

        return fileName
    }


    static _analyzeValue( { value, depth } ) {
        if( value === null || value === undefined ) {
            return { type: 'string', description: '', nullable: true }
        }

        if( Array.isArray( value ) ) {
            return OutputSchemaGenerator
                ._analyzeArray( { value, depth } )
        }

        if( typeof value === 'object' ) {
            return OutputSchemaGenerator
                ._analyzeObject( { value, depth } )
        }

        return { type: typeof value, description: '' }
    }


    static _analyzeObject( { value, depth } ) {
        const keys = Object.keys( value )

        if( keys.length === 0 ) {
            return { type: 'object', description: '' }
        }

        if( depth >= MAX_DEPTH ) {
            return { type: 'object', description: '' }
        }

        const properties = keys
            .reduce( ( acc, key ) => {
                const fieldValue = value[ key ]

                if( fieldValue === null ) {
                    const detectedType = OutputSchemaGenerator
                        ._guessTypeFromKey( { key } )
                    acc[ key ] = { type: detectedType, description: '', nullable: true }
                } else {
                    acc[ key ] = OutputSchemaGenerator
                        ._analyzeValue( { value: fieldValue, depth: depth + 1 } )
                }

                return acc
            }, {} )

        return { type: 'object', properties }
    }


    static _analyzeArray( { value, depth } ) {
        if( value.length === 0 ) {
            return { type: 'array', description: '', items: { type: 'string', description: '' } }
        }

        const firstItem = value[ 0 ]
        const items = OutputSchemaGenerator
            ._analyzeValue( { value: firstItem, depth: depth + 1 } )

        return { type: 'array', items, description: '' }
    }


    static _guessTypeFromKey( { key } ) {
        const lowerKey = key.toLowerCase()

        const isNumber = NUMBER_HINTS
            .some( ( hint ) => lowerKey.includes( hint ) )

        if( isNumber ) {
            return 'number'
        }

        const isBoolean = BOOLEAN_HINTS
            .some( ( hint ) => lowerKey.startsWith( hint ) || lowerKey === hint )

        if( isBoolean ) {
            return 'boolean'
        }

        return 'string'
    }

}
