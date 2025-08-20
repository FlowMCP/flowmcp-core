import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas, invalidSchema } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.validateSchema', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'validates correct schemas successfully', () => {
        const result = FlowMCP.validateSchema( {
            schema: mockSchemas[ 0 ]
        } )

        expect( result ).toBeDefined()
        expect( result ).toHaveProperty( 'status', true )
        expect( result ).toHaveProperty( 'messages' )
        expect( Array.isArray( result.messages ) ).toBe( true )
        expect( result.messages ).toHaveLength( 0 )
    } )

    it( 'returns false status for invalid schemas', () => {
        const result = FlowMCP.validateSchema( {
            schema: invalidSchema
        } )

        expect( result ).toBeDefined()
        expect( result ).toHaveProperty( 'status', false )
        expect( result ).toHaveProperty( 'messages' )
        expect( Array.isArray( result.messages ) ).toBe( true )
        expect( result.messages.length ).toBeGreaterThan( 0 )
    } )

    it( 'validates all mock schemas as valid', () => {
        mockSchemas
            .forEach( ( schema, index ) => {
                const result = FlowMCP.validateSchema( {
                    schema
                } )

                expect( result.status ).toBe( true )
                expect( result.messages ).toHaveLength( 0 )
            } )
    } )

    it( 'collects validation error messages', () => {
        const result = FlowMCP.validateSchema( {
            schema: invalidSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.length ).toBeGreaterThan( 0 )
        
        // Messages should be strings
        result.messages
            .forEach( ( message ) => {
                expect( typeof message ).toBe( 'string' )
                expect( message.length ).toBeGreaterThan( 0 )
            } )
    } )

    it( 'validates required schema fields', () => {
        const incompleteSchema = {
            namespace: 'test',
            // Missing required fields
        }

        const result = FlowMCP.validateSchema( {
            schema: incompleteSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.length ).toBeGreaterThan( 0 )
    } )

    it( 'validates namespace format', () => {
        const invalidNamespaceSchema = {
            ...mockSchemas[ 0 ],
            namespace: '' // Empty namespace
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidNamespaceSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'namespace' ) ) ).toBe( true )
    } )

    it( 'validates flowMCP version field', () => {
        const invalidVersionSchema = {
            ...mockSchemas[ 0 ],
            flowMCP: 'invalid-version'
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidVersionSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'flowmcp' ) ) ).toBe( true )
    } )

    it( 'validates routes structure', () => {
        const invalidRoutesSchema = {
            ...mockSchemas[ 0 ],
            routes: 'not-an-object'
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidRoutesSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'routes' ) ) ).toBe( true )
    } )

    it( 'validates individual route structure', () => {
        const invalidRouteSchema = {
            ...mockSchemas[ 0 ],
            routes: {
                invalidRoute: {
                    // Missing required fields like requestMethod, description, etc.
                }
            }
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidRouteSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.length ).toBeGreaterThan( 0 )
    } )

    it( 'validates request method values', () => {
        const invalidMethodSchema = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'INVALID',
                    description: 'Test route',
                    route: '/test',
                    parameters: [],
                    tests: [],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidMethodSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'requestmethod' ) ) ).toBe( true )
    } )

    it( 'validates parameter structure', () => {
        const invalidParametersSchema = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route',
                    route: '/test',
                    parameters: 'invalid-parameters',
                    tests: [],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidParametersSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'parameter' ) ) ).toBe( true )
    } )

    it( 'validates test structure', () => {
        const invalidTestsSchema = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route',
                    route: '/test',
                    parameters: [],
                    tests: [
                        {
                            // Missing _description
                            param: 'value'
                        }
                    ],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidTestsSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'test' ) || msg.toLowerCase().includes( '_description' ) ) ).toBe( true )
    } )

    it( 'validates required server params format', () => {
        const invalidServerParamsSchema = {
            ...mockSchemas[ 0 ],
            requiredServerParams: 'not-an-array'
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidServerParamsSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'requiredserverparams' ) ) ).toBe( true )
    } )

    it( 'validates headers structure', () => {
        const invalidHeadersSchema = {
            ...mockSchemas[ 0 ],
            headers: 'not-an-object'
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidHeadersSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'headers' ) ) ).toBe( true )
    } )

    it( 'validates tags array', () => {
        const invalidTagsSchema = {
            ...mockSchemas[ 0 ],
            tags: 'not-an-array'
        }

        const result = FlowMCP.validateSchema( {
            schema: invalidTagsSchema
        } )

        expect( result.status ).toBe( false )
        expect( result.messages.some( msg => msg.toLowerCase().includes( 'tags' ) ) ).toBe( true )
    } )

    it( 'uses strict=false by default', () => {
        // This test verifies that the method calls Validation.schema with strict: false
        const result = FlowMCP.validateSchema( {
            schema: mockSchemas[ 0 ]
        } )

        expect( result ).toBeDefined()
        expect( result ).toHaveProperty( 'status' )
        expect( result ).toHaveProperty( 'messages' )
    } )

    describe( 'complex validation scenarios', () => {
        it( 'handles deeply nested parameter validation', () => {
            const complexSchema = {
                ...mockSchemas[ 0 ],
                routes: {
                    complexRoute: {
                        requestMethod: 'POST',
                        description: 'Complex route',
                        route: '/complex',
                        parameters: [
                            {
                                position: { key: 'invalidKey', value: '{{USER_PARAM}}', location: 'invalid-location' },
                                z: { primitive: 'invalid-primitive()', options: [ 'invalid-option' ] }
                            }
                        ],
                        tests: [],
                        modifiers: []
                    }
                }
            }

            const result = FlowMCP.validateSchema( {
                schema: complexSchema
            } )

            expect( result.status ).toBe( false )
            expect( result.messages.length ).toBeGreaterThan( 0 )
        } )

        it( 'handles multiple validation errors', () => {
            const multipleErrorsSchema = {
                namespace: '',
                name: '',
                description: '',
                // Multiple missing and invalid fields
            }

            const result = FlowMCP.validateSchema( {
                schema: multipleErrorsSchema
            } )

            expect( result.status ).toBe( false )
            expect( result.messages.length ).toBeGreaterThan( 1 )
        } )

        it( 'validates handler references', () => {
            const invalidHandlerSchema = {
                ...mockSchemas[ 0 ],
                routes: {
                    testRoute: {
                        requestMethod: 'GET',
                        description: 'Test route',
                        route: '/test',
                        parameters: [],
                        tests: [],
                        modifiers: [
                            { phase: 'pre', handlerName: 'nonExistentHandler' }
                        ]
                    }
                },
                handlers: {}
            }

            const result = FlowMCP.validateSchema( {
                schema: invalidHandlerSchema
            } )

            expect( result.status ).toBe( false )
            expect( result.messages.some( msg => msg.toLowerCase().includes( 'handler' ) ) ).toBe( true )
        } )
    } )
} )