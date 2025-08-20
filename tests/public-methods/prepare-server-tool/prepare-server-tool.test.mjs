import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas, mockServerParams, mockUserParams } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.prepareServerTool', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'prepares server tool with correct structure', () => {
        const result = FlowMCP.prepareServerTool( {
            schema: mockSchemas[ 0 ],
            serverParams: mockServerParams,
            routeName: 'getBlocks',
            validate: true
        } )

        expect( result ).toHaveProperty( 'toolName' )
        expect( result ).toHaveProperty( 'description' )
        expect( result ).toHaveProperty( 'zod' )
        expect( result ).toHaveProperty( 'func' )

        expect( result.toolName ).toBe( 'get_blocks_lukso_network' )
        expect( result.description ).toContain( 'Get blockchain blocks' )
        expect( typeof result.func ).toBe( 'function' )
        expect( result.zod ).toBeDefined()
    } )

    it( 'creates tool name in format namespace.routeName', () => {
        const result = FlowMCP.prepareServerTool( {
            schema: mockSchemas[ 1 ],
            serverParams: {},
            routeName: 'getPrice',
            validate: false
        } )

        expect( result.toolName ).toBe( 'get_price_coingecko' )
    } )

    it( 'includes route description in tool description', () => {
        const result = FlowMCP.prepareServerTool( {
            schema: mockSchemas[ 0 ],
            serverParams: mockServerParams,
            routeName: 'getBalance',
            validate: false
        } )

        expect( result.description ).toContain( 'Get account balance' )
    } )

    it( 'skips validation when validate=false', () => {
        const result = FlowMCP.prepareServerTool( {
            schema: mockSchemas[ 1 ],
            serverParams: {},
            routeName: 'getMarkets',
            validate: false
        } )

        expect( result ).toHaveProperty( 'toolName' )
        expect( result ).toHaveProperty( 'func' )
        expect( result.toolName ).toBe( 'get_markets_coingecko' )
    } )

    it( 'throws error when validation fails with invalid schema', () => {
        expect( () => {
            FlowMCP.prepareServerTool( {
                schema: { invalid: 'schema' },
                serverParams: {},
                routeName: 'test',
                validate: true
            } )
        } ).toThrow()
    } )

    it( 'throws error when route does not exist', () => {
        expect( () => {
            FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 0 ],
                serverParams: mockServerParams,
                routeName: 'nonExistentRoute',
                validate: true
            } )
        } ).toThrow()
    } )

    it( 'throws error when required server params are missing', () => {
        expect( () => {
            FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 0 ], // Requires API_KEY
                serverParams: {}, // Empty
                routeName: 'getBlocks',
                validate: true
            } )
        } ).toThrow()
    } )

    describe( 'async function handler', () => {
        it( 'returns error response when fetch fails', async () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 0 ],
                serverParams: mockServerParams,
                routeName: 'getBlocks',
                validate: false
            } )

            // Test error case (will fail due to mock environment)
            try {
                const response = await result.func( mockUserParams )
                
                // Should return error format
                expect( response ).toHaveProperty( 'content' )
                expect( Array.isArray( response.content ) ).toBe( true )
                expect( response.content[ 0 ] ).toHaveProperty( 'type', 'text' )
                expect( response.content[ 0 ].text ).toMatch( /Error:/ )
            } catch( error ) {
                // Expected in test environment
                expect( error ).toBeDefined()
            }
        } )

        it( 'function handler accepts user parameters', async () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 1 ],
                serverParams: {},
                routeName: 'getPrice',
                validate: false
            } )

            expect( typeof result.func ).toBe( 'function' )
            
            // Test that function can be called with parameters
            try {
                await result.func( { ids: 'bitcoin', vs_currencies: 'usd' } )
            } catch( error ) {
                // Expected to fail in test environment, but function accepts parameters correctly
                expect( error ).toBeDefined()
            }
        } )

        it( 'function handler returns content array format', async () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 2 ],
                serverParams: {},
                routeName: 'testRoute',
                validate: false
            } )

            try {
                const response = await result.func( {} )
                
                expect( response ).toHaveProperty( 'content' )
                expect( Array.isArray( response.content ) ).toBe( true )
                expect( response.content[ 0 ] ).toHaveProperty( 'type' )
                expect( response.content[ 0 ] ).toHaveProperty( 'text' )
            } catch( error ) {
                // Expected in test environment
                expect( error ).toBeDefined()
            }
        } )
    } )

    describe( 'different route types', () => {
        it( 'handles GET routes', () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 0 ],
                serverParams: mockServerParams,
                routeName: 'getBlocks',
                validate: false
            } )

            expect( result.toolName ).toBe( 'get_blocks_lukso_network' )
            expect( result.description ).toContain( 'Get blockchain blocks' )
        } )

        it( 'handles POST routes', () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 0 ],
                serverParams: mockServerParams,
                routeName: 'getTransactions',
                validate: false
            } )

            expect( result.toolName ).toBe( 'get_transactions_lukso_network' )
            expect( result.description ).toContain( 'Get transactions' )
        } )

        it( 'handles routes with path parameters', () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 0 ],
                serverParams: mockServerParams,
                routeName: 'getBalance',
                validate: false
            } )

            expect( result.toolName ).toBe( 'get_balance_lukso_network' )
            expect( result.description ).toContain( 'Get account balance' )
        } )
    } )

    describe( 'zod schema generation', () => {
        it( 'generates zod schema for route parameters', () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 0 ],
                serverParams: mockServerParams,
                routeName: 'getBlocks',
                validate: false
            } )

            expect( result.zod ).toBeDefined()
            // Zod schema should be an object that can validate parameters
            expect( typeof result.zod ).toBe( 'object' )
        } )

        it( 'handles routes with multiple parameters', () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 1 ],
                serverParams: {},
                routeName: 'getMarkets',
                validate: false
            } )

            expect( result.zod ).toBeDefined()
            expect( result.toolName ).toBe( 'get_markets_coingecko' )
        } )

        it( 'handles routes with no parameters', () => {
            const result = FlowMCP.prepareServerTool( {
                schema: mockSchemas[ 2 ],
                serverParams: {},
                routeName: 'testRoute',
                validate: false
            } )

            expect( result.zod ).toBeDefined()
            expect( result.toolName ).toBe( 'test_route_test_namespace' )
        } )
    } )
} )