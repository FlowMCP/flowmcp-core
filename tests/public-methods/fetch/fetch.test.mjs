import { FlowMCP } from '../../../src/index.mjs'
import { Fetch } from '../../../src/task/Fetch.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.fetch: Fetch Coverage Tests', () => {
    it( 'handles stringifyResponseData with null data', () => {
        const result = Fetch.stringifyResponseData( { data: null } )

        expect( result ).toHaveProperty( 'dataAsString' )
        expect( result.dataAsString ).toBe( 'null' )
    } )


    it( 'handles stringifyResponseData with object data', () => {
        const testData = { test: 'value', number: 123 }
        const result = Fetch.stringifyResponseData( { data: testData } )

        expect( result ).toHaveProperty( 'dataAsString' )
        expect( result.dataAsString ).toBe( JSON.stringify( testData ) )
    } )


    it( 'handles stringifyResponseData with circular reference', () => {
        const circularData = { name: 'test' }
        circularData.self = circularData

        const result = Fetch.stringifyResponseData( { data: circularData } )

        expect( result ).toHaveProperty( 'dataAsString' )
        expect( result.dataAsString ).toContain( 'test' )
    } )


    it( 'handles stringifyResponseData with array data', () => {
        const arrayData = [ 'item1', 'item2', { nested: 'value' } ]
        const result = Fetch.stringifyResponseData( { data: arrayData } )

        expect( result ).toHaveProperty( 'dataAsString' )
        expect( result.dataAsString ).toBe( JSON.stringify( arrayData ) )
    } )


    it( 'handles stringifyResponseData with primitive data', () => {
        const result1 = Fetch.stringifyResponseData( { data: 'string' } )
        const result2 = Fetch.stringifyResponseData( { data: 123 } )
        const result3 = Fetch.stringifyResponseData( { data: true } )

        expect( result1.dataAsString ).toBe( '"string"' )
        expect( result2.dataAsString ).toBe( '123' )
        expect( result3.dataAsString ).toBe( 'true' )
    } )


    it( 'handles stringifyResponseData with undefined data', () => {
        const result = Fetch.stringifyResponseData( { data: undefined } )

        expect( result ).toHaveProperty( 'dataAsString' )
        expect( result.dataAsString ).toBe( undefined )
    } )


    it( 'handles stringifyResponseData with complex nested object', () => {
        const complexData = {
            level1: {
                level2: {
                    level3: [ 1, 2, { deep: 'value' } ]
                }
            },
            array: [ 'a', 'b', 'c' ],
            nullValue: null,
            boolValue: false
        }

        const result = Fetch.stringifyResponseData( { data: complexData } )

        expect( result ).toHaveProperty( 'dataAsString' )
        expect( result.dataAsString ).toContain( 'level1' )
        expect( result.dataAsString ).toContain( 'deep' )
        expect( result.dataAsString ).toContain( 'value' )
    } )


    it( 'handles stringifyResponseData with empty objects and arrays', () => {
        const emptyData = {
            emptyObject: {},
            emptyArray: [],
            emptyString: ''
        }

        const result = Fetch.stringifyResponseData( { data: emptyData } )

        expect( result ).toHaveProperty( 'dataAsString' )
        expect( result.dataAsString ).toContain( '{}' )
        expect( result.dataAsString ).toContain( '[]' )
        expect( result.dataAsString ).toContain( '""' )
    } )


    it( 'handles fetch with empty modifiers array', async () => {
        const schemaWithoutModifiers = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route without modifiers',
                    route: '/test',
                    parameters: [],
                    tests: [],
                    modifiers: []
                }
            }
        }

        await expect( async () => {
            await FlowMCP.fetch( {
                schema: schemaWithoutModifiers,
                userParams: {},
                serverParams: { API_KEY: 'test' },
                routeName: 'testRoute'
            } )
        } ).not.toThrow()
    } )


    it( 'handles fetch validation with proper serverParams', async () => {
        await expect( async () => {
            await FlowMCP.fetch( {
                schema: mockSchemas[ 0 ],
                userParams: { limit: 10 },
                serverParams: { API_KEY: 'test-key' },
                routeName: 'getBlocks'
            } )
        } ).not.toThrow()
    } )


    it( 'handles fetch with different parameter locations', async () => {
        const schemaWithMultipleParams = {
            ...mockSchemas[ 0 ],
            routes: {
                multiParamRoute: {
                    requestMethod: 'POST',
                    description: 'Test route with multiple parameter locations',
                    route: '/multi/:pathParam',
                    parameters: [
                        {
                            position: { key: 'pathParam', value: '{{USER_PARAM}}', location: 'insert' },
                            z: { primitive: 'string()', options: [] }
                        },
                        {
                            position: { key: 'queryParam', value: '{{USER_PARAM}}', location: 'query' },
                            z: { primitive: 'string()', options: [] }
                        },
                        {
                            position: { key: 'bodyParam', value: '{{USER_PARAM}}', location: 'body' },
                            z: { primitive: 'string()', options: [] }
                        }
                    ],
                    tests: [],
                    modifiers: []
                }
            }
        }

        await expect( async () => {
            await FlowMCP.fetch( {
                schema: schemaWithMultipleParams,
                userParams: { pathParam: 'test', queryParam: 'value', bodyParam: 'data' },
                serverParams: { API_KEY: 'test' },
                routeName: 'multiParamRoute'
            } )
        } ).not.toThrow()
    } )
} )