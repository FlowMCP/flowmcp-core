class OutputSchemaGenerator {
    static generate( { response, mimeType = 'application/json' } ) {
        const schema = OutputSchemaGenerator
            .#analyzeValue( { value: response, depth: 1 } )

        const output = { mimeType, schema }

        return { output }
    }


    static #analyzeValue( { value, depth } ) {
        if( value === null || value === undefined ) {
            const schema = { type: 'string', description: '', nullable: true }

            return schema
        }

        if( Array.isArray( value ) ) {
            const schema = OutputSchemaGenerator
                .#analyzeArray( { value, depth } )

            return schema
        }

        if( typeof value === 'object' ) {
            const schema = OutputSchemaGenerator
                .#analyzeObject( { value, depth } )

            return schema
        }

        const schema = { type: typeof value, description: '' }

        return schema
    }


    static #analyzeObject( { value, depth } ) {
        const keys = Object.keys( value )

        if( keys.length === 0 ) {
            const schema = { type: 'object', description: '' }

            return schema
        }

        if( depth >= 4 ) {
            const schema = { type: 'object', description: '' }

            return schema
        }

        const properties = {}

        keys
            .forEach( ( key ) => {
                const fieldValue = value[ key ]

                if( fieldValue === null ) {
                    const detectedType = OutputSchemaGenerator
                        .#guessTypeFromKey( { key } )
                    properties[ key ] = { type: detectedType, description: '', nullable: true }
                } else {
                    properties[ key ] = OutputSchemaGenerator
                        .#analyzeValue( { value: fieldValue, depth: depth + 1 } )
                }
            } )

        const schema = { type: 'object', properties }

        return schema
    }


    static #analyzeArray( { value, depth } ) {
        if( value.length === 0 ) {
            const schema = { type: 'array', description: '', items: { type: 'string', description: '' } }

            return schema
        }

        const firstItem = value[ 0 ]
        const items = OutputSchemaGenerator
            .#analyzeValue( { value: firstItem, depth: depth + 1 } )

        const schema = { type: 'array', items, description: '' }

        return schema
    }


    static #guessTypeFromKey( { key } ) {
        const numberHints = [
            'price', 'amount', 'balance', 'cap', 'volume', 'count',
            'total', 'fee', 'rate', 'supply', 'value', 'size',
            'height', 'width', 'index', 'number', 'timestamp',
            'decimals', 'market_cap', 'marketCap'
        ]

        const lowerKey = key.toLowerCase()

        const isNumber = numberHints
            .some( ( hint ) => {
                const match = lowerKey.includes( hint )

                return match
            } )

        if( isNumber ) {
            const type = 'number'

            return type
        }

        const booleanHints = [
            'is', 'has', 'can', 'should', 'enabled', 'active',
            'verified', 'valid', 'visible', 'hidden', 'frozen'
        ]

        const isBoolean = booleanHints
            .some( ( hint ) => {
                const match = lowerKey.startsWith( hint ) || lowerKey === hint

                return match
            } )

        if( isBoolean ) {
            const type = 'boolean'

            return type
        }

        const type = 'string'

        return type
    }
}


export { OutputSchemaGenerator }
