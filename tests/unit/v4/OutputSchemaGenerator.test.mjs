import { describe, it, expect } from '@jest/globals'
import { OutputSchemaGenerator } from '../../../src/v4/task/OutputSchemaGenerator.mjs'


describe( 'OutputSchemaGenerator (v4)', () => {
    describe( 'generateFromResponse()', () => {
        it( 'returns output with default mimeType application/json', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: { hello: 'world' },
                schemaId: 'etherscan-io/contracts'
            } )

            expect( output.mimeType ).toBe( 'application/json' )
            expect( output.schema.type ).toBe( 'object' )
        } )

        it( 'uses provided mimeType', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: 'plain text',
                mimeType: 'text/plain',
                schemaId: 'etherscan-io/contracts'
            } )

            expect( output.mimeType ).toBe( 'text/plain' )
        } )

        it( 'suggestedFileName uses underscores for slashes and date suffix', () => {
            const { suggestedFileName } = OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: 'etherscan-io/contracts'
            } )

            expect( suggestedFileName ).toMatch( /^etherscan-io_contracts-capture-\d{4}-\d{2}-\d{2}\.json$/ )
        } )

        it( 'preserves hyphens in schema-name part', () => {
            const { suggestedFileName } = OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: 'moralis/wallet-history'
            } )

            expect( suggestedFileName ).toMatch( /^moralis_wallet-history-capture-\d{4}-\d{2}-\d{2}\.json$/ )
        } )

        it( 'throws when schemaId is a Primitive-ID (2 slashes)', () => {
            expect( () => OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: 'etherscan-io/tool/getAbi'
            } ) ).toThrow( /Schema-File-ID \(1 slash\)/ )
        } )

        it( 'throws when schemaId has zero slashes', () => {
            expect( () => OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: 'etherscan-io'
            } ) ).toThrow( /Schema-File-ID \(1 slash\)/ )
        } )

        it( 'throws when schemaId is empty string', () => {
            expect( () => OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: ''
            } ) ).toThrow( /schemaId must be a non-empty string/ )
        } )

        it( 'throws when schemaId is not a string', () => {
            expect( () => OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: 123
            } ) ).toThrow( /schemaId must be a non-empty string/ )
        } )

        it( 'analyzes nested object correctly', () => {
            const response = {
                price: 100,
                isActive: true,
                items: [ { name: 'A' } ]
            }
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response,
                schemaId: 'demo/sample'
            } )

            expect( output.schema.type ).toBe( 'object' )
            expect( output.schema.properties.price.type ).toBe( 'number' )
            expect( output.schema.properties.isActive.type ).toBe( 'boolean' )
            expect( output.schema.properties.items.type ).toBe( 'array' )
            expect( output.schema.properties.items.items.type ).toBe( 'object' )
        } )

        it( 'handles empty arrays', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: { tags: [] },
                schemaId: 'demo/sample'
            } )

            expect( output.schema.properties.tags.type ).toBe( 'array' )
            expect( output.schema.properties.tags.items.type ).toBe( 'string' )
        } )

        it( 'caps depth at MAX_DEPTH (4) for deep nesting', () => {
            const deep = { a: { b: { c: { d: { e: 'too deep' } } } } }
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: deep,
                schemaId: 'demo/sample'
            } )

            expect( output.schema.type ).toBe( 'object' )
        } )

        it( 'returns nullable string for null response', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: null,
                schemaId: 'demo/sample'
            } )

            expect( output.schema.nullable ).toBe( true )
            expect( output.schema.type ).toBe( 'string' )
        } )

        it( 'guesses number type for null field with number-hint key', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: { balance: null },
                schemaId: 'demo/sample'
            } )

            expect( output.schema.properties.balance.type ).toBe( 'number' )
            expect( output.schema.properties.balance.nullable ).toBe( true )
        } )

        it( 'guesses boolean type for null field with boolean-hint key', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: { isVerified: null },
                schemaId: 'demo/sample'
            } )

            expect( output.schema.properties.isVerified.type ).toBe( 'boolean' )
            expect( output.schema.properties.isVerified.nullable ).toBe( true )
        } )

        it( 'falls back to string type for null field with unknown key', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: { foo: null },
                schemaId: 'demo/sample'
            } )

            expect( output.schema.properties.foo.type ).toBe( 'string' )
            expect( output.schema.properties.foo.nullable ).toBe( true )
        } )

        it( 'returns empty-object schema description for empty objects', () => {
            const { output } = OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: 'demo/sample'
            } )

            expect( output.schema.type ).toBe( 'object' )
            expect( output.schema.description ).toBe( '' )
        } )

        it( 'uses today date in YYYY-MM-DD format', () => {
            const { suggestedFileName } = OutputSchemaGenerator.generateFromResponse( {
                response: {},
                schemaId: 'demo/sample'
            } )

            const today = new Date().toISOString().slice( 0, 10 )
            expect( suggestedFileName ).toBe( `demo_sample-capture-${today}.json` )
        } )

        it( 'returns both output and suggestedFileName keys', () => {
            const result = OutputSchemaGenerator.generateFromResponse( {
                response: { x: 1 },
                schemaId: 'demo/sample'
            } )

            expect( Object.keys( result ).sort() ).toEqual( [ 'output', 'suggestedFileName' ] )
        } )
    } )
} )
