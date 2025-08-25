import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.getZodInterfaces: Interface Coverage Tests', () => {
    it( 'handles schemas with empty routes object', () => {
        const emptyRoutesSchema = {
            ...mockSchemas[ 0 ],
            routes: {}
        }

        const result = FlowMCP.getZodInterfaces( { schema: emptyRoutesSchema } )

        expect( result ).toEqual( {} )
    } )


    it( 'handles parameters with missing z property', () => {
        const schemaWithMissingZ = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route for missing z property',
                    route: '/test',
                    parameters: [
                        {
                            position: { key: 'param1', value: '{{USER_PARAM}}', location: 'query' }
                        }
                    ],
                    tests: [
                        { _description: 'Test with missing z', param1: 'testValue' }
                    ],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.getZodInterfaces( { schema: schemaWithMissingZ } )

        expect( result ).toHaveProperty( 'testRoute' )
        expect( result.testRoute ).toBeDefined()
    } )


    it( 'handles parameters with optional() in z.options', () => {
        const schemaWithOptional = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route for optional parameters',
                    route: '/test',
                    parameters: [
                        {
                            position: { key: 'optionalParam', value: '{{USER_PARAM}}', location: 'query' },
                            z: { primitive: 'string()', options: [ 'optional()', 'default(\"test\")' ] }
                        }
                    ],
                    tests: [
                        { _description: 'Test with optional param', optionalParam: 'testValue' }
                    ],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.getZodInterfaces( { schema: schemaWithOptional } )

        expect( result ).toHaveProperty( 'testRoute' )
        expect( result.testRoute ).toBeDefined()
    } )


    it( 'generates zod schema for boolean parameters', () => {
        const schemaWithBoolean = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route for boolean parameters',
                    route: '/test',
                    parameters: [
                        {
                            position: { key: 'boolParam', value: '{{USER_PARAM}}', location: 'query' },
                            z: { primitive: 'boolean()', options: [] }
                        }
                    ],
                    tests: [
                        { _description: 'Test with boolean param', boolParam: true }
                    ],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.getZodInterfaces( { schema: schemaWithBoolean } )

        expect( result ).toHaveProperty( 'testRoute' )
        expect( result.testRoute ).toBeDefined()
    } )


    it( 'handles complex parameter options with multiple constraints', () => {
        const schemaWithComplexOptions = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route for complex parameter constraints',  
                    route: '/test',
                    parameters: [
                        {
                            position: { key: 'complexParam', value: '{{USER_PARAM}}', location: 'query' },
                            z: { 
                                primitive: 'string()', 
                                options: [ 'min(5)', 'max(100)', 'optional()', 'default(\"defaultValue\")' ] 
                            }
                        }
                    ],
                    tests: [
                        { _description: 'Test with complex param', complexParam: 'testComplexValue' }
                    ],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.getZodInterfaces( { schema: schemaWithComplexOptions } )

        expect( result ).toHaveProperty( 'testRoute' )
        expect( result.testRoute ).toBeDefined()
    } )
} )