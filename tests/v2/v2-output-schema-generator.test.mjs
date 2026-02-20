import { describe, test, expect } from '@jest/globals'
import { OutputSchemaGenerator } from '../../src/v2/task/OutputSchemaGenerator.mjs'


describe( 'OutputSchemaGenerator', () => {
    describe( 'generate()', () => {
        test( 'generates schema from a flat object response', () => {
            const response = {
                id: 'bitcoin',
                price: 45000,
                active: true
            }

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['mimeType'] ).toBe( 'application/json' )
            expect( output['schema']['type'] ).toBe( 'object' )
            expect( output['schema']['properties']['id']['type'] ).toBe( 'string' )
            expect( output['schema']['properties']['price']['type'] ).toBe( 'number' )
            expect( output['schema']['properties']['active']['type'] ).toBe( 'boolean' )
        } )


        test( 'generates schema from an array response', () => {
            const response = [
                { name: 'Ethereum', tvl: 50000000 }
            ]

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['schema']['type'] ).toBe( 'array' )
            expect( output['schema']['items']['type'] ).toBe( 'object' )
            expect( output['schema']['items']['properties']['name']['type'] ).toBe( 'string' )
            expect( output['schema']['items']['properties']['tvl']['type'] ).toBe( 'number' )
        } )


        test( 'generates schema from an array of strings', () => {
            const response = [ 'crypto', 'defi', 'nft' ]

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['schema']['type'] ).toBe( 'array' )
            expect( output['schema']['items']['type'] ).toBe( 'string' )
        } )


        test( 'handles nested objects up to 4 levels', () => {
            const response = {
                level1: {
                    level2: {
                        level3: {
                            deepValue: 'found'
                        }
                    }
                }
            }

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            const l1 = output['schema']['properties']['level1']
            expect( l1['type'] ).toBe( 'object' )

            const l2 = l1['properties']['level2']
            expect( l2['type'] ).toBe( 'object' )

            const l3 = l2['properties']['level3']
            expect( l3['type'] ).toBe( 'object' )
            expect( l3['properties'] ).toBeUndefined()
        } )


        test( 'marks null values as nullable', () => {
            const response = {
                id: 'bitcoin',
                marketCap: null,
                tags: [ 'crypto' ]
            }

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['schema']['properties']['id']['nullable'] ).toBeUndefined()
            expect( output['schema']['properties']['marketCap']['nullable'] ).toBe( true )
        } )


        test( 'detects correct types for mixed values', () => {
            const response = {
                name: 'test',
                count: 42,
                active: false,
                items: [ 1, 2, 3 ],
                meta: { key: 'value' }
            }

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            const { properties } = output['schema']
            expect( properties['name']['type'] ).toBe( 'string' )
            expect( properties['count']['type'] ).toBe( 'number' )
            expect( properties['active']['type'] ).toBe( 'boolean' )
            expect( properties['items']['type'] ).toBe( 'array' )
            expect( properties['items']['items']['type'] ).toBe( 'number' )
            expect( properties['meta']['type'] ).toBe( 'object' )
        } )


        test( 'handles empty object response', () => {
            const response = {}

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['schema']['type'] ).toBe( 'object' )
            expect( output['schema']['properties'] ).toBeUndefined()
        } )


        test( 'handles empty array response', () => {
            const response = []

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['schema']['type'] ).toBe( 'array' )
            expect( output['schema']['items']['type'] ).toBe( 'string' )
        } )


        test( 'uses default mimeType application/json', () => {
            const { output } = OutputSchemaGenerator
                .generate( { response: { id: 'test' } } )

            expect( output['mimeType'] ).toBe( 'application/json' )
        } )


        test( 'accepts custom mimeType', () => {
            const { output } = OutputSchemaGenerator
                .generate( { response: 'raw text data', mimeType: 'text/plain' } )

            expect( output['mimeType'] ).toBe( 'text/plain' )
            expect( output['schema']['type'] ).toBe( 'string' )
        } )


        test( 'generates schema for image/png mimeType', () => {
            const { output } = OutputSchemaGenerator
                .generate( { response: 'iVBORw0KGgo...', mimeType: 'image/png' } )

            expect( output['mimeType'] ).toBe( 'image/png' )
            expect( output['schema']['type'] ).toBe( 'string' )
        } )


        test( 'adds description placeholders to properties', () => {
            const response = { id: 'test', count: 5 }

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['schema']['properties']['id']['description'] ).toBe( '' )
            expect( output['schema']['properties']['count']['description'] ).toBe( '' )
        } )


        test( 'handles null response as nullable string', () => {
            const { output } = OutputSchemaGenerator
                .generate( { response: null } )

            expect( output['schema']['type'] ).toBe( 'string' )
            expect( output['schema']['nullable'] ).toBe( true )
        } )


        test( 'handles array of objects with nested arrays', () => {
            const response = [
                { name: 'Token', tags: [ 'defi', 'swap' ] }
            ]

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            const itemProps = output['schema']['items']['properties']
            expect( itemProps['tags']['type'] ).toBe( 'array' )
            expect( itemProps['tags']['items']['type'] ).toBe( 'string' )
        } )


        test( 'guesses number type for null fields with number-like keys', () => {
            const response = {
                marketCap: null,
                totalVolume: null
            }

            const { output } = OutputSchemaGenerator
                .generate( { response } )

            expect( output['schema']['properties']['marketCap']['type'] ).toBe( 'number' )
            expect( output['schema']['properties']['totalVolume']['type'] ).toBe( 'number' )
        } )
    } )
} )
