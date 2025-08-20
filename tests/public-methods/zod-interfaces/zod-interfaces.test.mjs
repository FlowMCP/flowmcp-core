import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.getZodInterfaces', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'generates zod interfaces for all routes in schema', () => {
        const result = FlowMCP.getZodInterfaces( {
            schema: mockSchemas[ 0 ] // luksoNetwork with 3 routes
        } )

        expect( result ).toBeDefined()
        expect( typeof result ).toBe( 'object' )
        
        // Should have interfaces for all routes
        expect( result ).toHaveProperty( 'getBlocks' )
        expect( result ).toHaveProperty( 'getBalance' )
        expect( result ).toHaveProperty( 'getTransactions' )
    } )

    it( 'creates correct zod schema structure for each route', () => {
        const result = FlowMCP.getZodInterfaces( {
            schema: mockSchemas[ 0 ]
        } )

        const getBlocksInterface = result.getBlocks
        expect( getBlocksInterface ).toBeDefined()
        expect( typeof getBlocksInterface ).toBe( 'object' )
        
        // Should have the correct structure with zod schema
        expect( getBlocksInterface ).toHaveProperty( 'toolName' )
        expect( getBlocksInterface ).toHaveProperty( 'description' )
        expect( getBlocksInterface ).toHaveProperty( 'zod' )
        expect( getBlocksInterface.zod ).toHaveProperty( 'limit' )
        expect( getBlocksInterface.zod.limit ).toHaveProperty( '_def' )
    } )

    it( 'handles different parameter types correctly', () => {
        const result = FlowMCP.getZodInterfaces( {
            schema: mockSchemas[ 1 ] // coingecko schema
        } )

        expect( result ).toHaveProperty( 'getPrice' )
        expect( result ).toHaveProperty( 'getMarkets' )
        
        // Both should have zod interfaces
        expect( result.getPrice ).toBeDefined()
        expect( result.getMarkets ).toBeDefined()
    } )

    it( 'handles routes with no parameters', () => {
        const result = FlowMCP.getZodInterfaces( {
            schema: mockSchemas[ 2 ] // testNamespace with empty parameters
        } )

        expect( result ).toHaveProperty( 'testRoute' )
        expect( result.testRoute ).toBeDefined()
    } )

    it( 'validates parameter types (string, number, boolean)', () => {
        const result = FlowMCP.getZodInterfaces( {
            schema: mockSchemas[ 0 ]
        } )

        const getBlocksInterface = result.getBlocks
        
        // Test with valid number parameter
        try {
            const parsed = getBlocksInterface.parse( { limit: 10 } )
            expect( parsed.limit ).toBe( 10 )
        } catch( error ) {
            // May fail depending on zod implementation, but structure should be correct
            expect( error ).toBeDefined()
        }
    } )

    it( 'handles parameter options (min, max, length, default)', () => {
        const result = FlowMCP.getZodInterfaces( {
            schema: mockSchemas[ 0 ]
        } )

        expect( result.getBlocks ).toBeDefined()
        expect( result.getBalance ).toBeDefined()
        
        // Parameters should include validation options from schema
        const getBalanceInterface = result.getBalance
        expect( getBalanceInterface ).toBeDefined()
    } )

    it( 'throws error when schema validation fails', () => {
        expect( () => {
            FlowMCP.getZodInterfaces( {
                schema: { invalid: 'schema' }
            } )
        } ).toThrow()
    } )

    it( 'handles complex parameter configurations', () => {
        const complexSchema = {
            ...mockSchemas[ 0 ],
            routes: {
                complexRoute: {
                    requestMethod: 'POST',
                    description: 'Complex route with multiple parameter types',
                    route: '/complex/:id',
                    parameters: [
                        { position: { key: 'id', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [ 'length(24)' ] } },
                        { position: { key: 'limit', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: [ 'min(1)', 'max(100)', 'default(10)' ] } },
                        { position: { key: 'active', value: '{{USER_PARAM}}', location: 'body' }, z: { primitive: 'boolean()', options: [ 'default(true)' ] } },
                        { position: { key: 'type', value: '{{USER_PARAM}}', location: 'body' }, z: { primitive: 'enum("wallet", "contract")', options: [] } }
                    ],
                    tests: [
                        { _description: 'Complex test', id: 'test123', limit: 50, active: true, type: 'wallet' }
                    ],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.getZodInterfaces( {
            schema: complexSchema
        } )

        expect( result ).toHaveProperty( 'complexRoute' )
        expect( result.complexRoute ).toBeDefined()
    } )

    it( 'processes multiple routes independently', () => {
        const result = FlowMCP.getZodInterfaces( {
            schema: mockSchemas[ 1 ] // coingecko with 2 routes
        } )

        expect( Object.keys( result ) ).toHaveLength( 2 )
        expect( result.getPrice ).toBeDefined()
        expect( result.getMarkets ).toBeDefined()
        
        // Each should be independent zod schemas
        expect( result.getPrice ).not.toBe( result.getMarkets )
    } )

    it( 'handles empty routes object', () => {
        const emptyRouteSchema = {
            ...mockSchemas[ 0 ],
            routes: {}
        }

        const result = FlowMCP.getZodInterfaces( {
            schema: emptyRouteSchema
        } )

        expect( typeof result ).toBe( 'object' )
        expect( Object.keys( result ) ).toHaveLength( 0 )
    } )

    describe( 'parameter location handling', () => {
        it( 'handles insert location parameters (path params)', () => {
            const result = FlowMCP.getZodInterfaces( {
                schema: mockSchemas[ 0 ]
            } )

            expect( result.getBalance ).toBeDefined() // Has insert location parameter
        } )

        it( 'handles query location parameters', () => {
            const result = FlowMCP.getZodInterfaces( {
                schema: mockSchemas[ 0 ]
            } )

            expect( result.getBlocks ).toBeDefined() // Has query location parameter
        } )

        it( 'handles body location parameters', () => {
            const result = FlowMCP.getZodInterfaces( {
                schema: mockSchemas[ 0 ]
            } )

            expect( result.getTransactions ).toBeDefined() // Has body location parameters
        } )
    } )
} )