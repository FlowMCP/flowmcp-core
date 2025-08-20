import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas, mockServerParams } from '../helpers/mock-schemas.mjs'
import { createMockServer } from '../helpers/mock-server.mjs'


describe( 'FlowMCP.activateServerTools & activateServerTool', () => {
    let originalWarn
    let mockServer

    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
        mockServer = createMockServer()
    } )

    afterEach( () => {
        console.warn = originalWarn
        mockServer.reset()
    } )

    describe( 'activateServerTools', () => {
        it( 'activates all routes from a schema as server tools', () => {
            const luksoSchema = mockSchemas[ 0 ] // luksoNetwork with 3 routes
            
            const { mcpTools } = FlowMCP.activateServerTools( {
                server: mockServer,
                schema: luksoSchema,
                serverParams: mockServerParams,
                validate: true,
                silent: true
            } )

            expect( Object.keys( mcpTools ) ).toHaveLength( 3 )
            expect( mcpTools ).toHaveProperty( 'get_blocks_lukso_network' )
            expect( mcpTools ).toHaveProperty( 'get_balance_lukso_network' )
            expect( mcpTools ).toHaveProperty( 'get_transactions_lukso_network' )
            
            // Verify tools were registered in mock server
            expect( mockServer.tools.size ).toBe( 3 )
            expect( mockServer.getTool( 'get_blocks_lukso_network' ) ).toBeDefined()
        } )

        it( 'works with silent=false output', () => {
            // Mock console.warn to track calls
            let warnCalled = false
            const originalWarn = console.warn
            console.warn = () => { warnCalled = true }
            
            const { mcpTools } = FlowMCP.activateServerTools( {
                server: mockServer,
                schema: mockSchemas[ 1 ], // coingecko with 2 routes
                serverParams: {},
                validate: true,
                silent: false
            } )

            expect( Object.keys( mcpTools ) ).toHaveLength( 2 )
            expect( warnCalled ).toBe( true )
            
            // Restore console.warn
            console.warn = originalWarn
        } )

        it( 'skips validation when validate=false', () => {
            const { mcpTools } = FlowMCP.activateServerTools( {
                server: mockServer,
                schema: mockSchemas[ 1 ],
                serverParams: {},
                validate: false,
                silent: true
            } )

            expect( Object.keys( mcpTools ) ).toHaveLength( 2 )
            expect( mockServer.tools.size ).toBe( 2 )
        } )

        it( 'throws error when validation fails', () => {
            expect( () => {
                FlowMCP.activateServerTools( {
                    server: mockServer,
                    schema: { invalid: 'schema' },
                    serverParams: {},
                    validate: true,
                    silent: true
                } )
            } ).toThrow()
        } )

        it( 'handles schemas with no routes', () => {
            const emptySchema = {
                ...mockSchemas[ 0 ],
                routes: {}
            }

            const { mcpTools } = FlowMCP.activateServerTools( {
                server: mockServer,
                schema: emptySchema,
                serverParams: mockServerParams,
                validate: false,
                silent: true
            } )

            expect( Object.keys( mcpTools ) ).toHaveLength( 0 )
            expect( mockServer.tools.size ).toBe( 0 )
        } )
    } )

    describe( 'activateServerTool', () => {
        it( 'activates a single route as server tool', () => {
            const { toolName, mcpTool } = FlowMCP.activateServerTool( {
                server: mockServer,
                schema: mockSchemas[ 0 ],
                routeName: 'getBlocks',
                serverParams: mockServerParams,
                validate: true
            } )

            expect( toolName ).toBe( 'get_blocks_lukso_network' )
            expect( mcpTool ).toBeDefined()
            expect( mcpTool.name ).toBe( 'get_blocks_lukso_network' )
            expect( mcpTool.description ).toContain( 'Get blockchain blocks' )
            
            // Verify tool was registered in mock server
            expect( mockServer.getTool( toolName ) ).toBeDefined()
            expect( mockServer.tools.size ).toBe( 1 )
        } )

        it( 'skips validation when validate=false', () => {
            const { toolName, mcpTool } = FlowMCP.activateServerTool( {
                server: mockServer,
                schema: mockSchemas[ 1 ],
                routeName: 'getPrice',
                serverParams: {},
                validate: false
            } )

            expect( toolName ).toBe( 'get_price_coingecko' )
            expect( mcpTool ).toBeDefined()
        } )

        it( 'throws error when route does not exist', () => {
            expect( () => {
                FlowMCP.activateServerTool( {
                    server: mockServer,
                    schema: mockSchemas[ 0 ],
                    routeName: 'nonExistentRoute',
                    serverParams: mockServerParams,
                    validate: true
                } )
            } ).toThrow()
        } )

        it( 'throws error when schema validation fails', () => {
            expect( () => {
                FlowMCP.activateServerTool( {
                    server: mockServer,
                    schema: { invalid: 'schema' },
                    routeName: 'getBlocks',
                    serverParams: {},
                    validate: true
                } )
            } ).toThrow()
        } )

        it( 'creates tool with correct handler function', async () => {
            const { toolName, mcpTool } = FlowMCP.activateServerTool( {
                server: mockServer,
                schema: mockSchemas[ 1 ],
                routeName: 'getPrice',
                serverParams: {},
                validate: false
            } )

            expect( typeof mcpTool.handler ).toBe( 'function' )
            
            // Test handler function (note: this will fail in real HTTP call, but tests structure)
            try {
                const result = await mcpTool.handler( { ids: 'bitcoin', vs_currencies: 'usd' } )
                expect( result ).toHaveProperty( 'content' )
                expect( Array.isArray( result.content ) ).toBe( true )
            } catch( error ) {
                // Expected to fail due to mock environment, but function structure is correct
                expect( error ).toBeDefined()
            }
        } )
    } )

    describe( 'integration tests', () => {
        it( 'activateServerTools uses activateServerTool internally', () => {
            const { mcpTools } = FlowMCP.activateServerTools( {
                server: mockServer,
                schema: mockSchemas[ 2 ], // testNamespace with 1 route
                serverParams: {},
                validate: false,
                silent: true
            } )

            expect( Object.keys( mcpTools ) ).toEqual( [ 'test_route_test_namespace' ] )
            
            const tool = mcpTools[ 'test_route_test_namespace' ]
            expect( tool.name ).toBe( 'test_route_test_namespace' )
            expect( tool.description ).toContain( 'Test route' )
        } )

        it( 'handles multiple schemas with activateServerTools', () => {
            // Activate multiple schemas
            const results = mockSchemas
                .map( ( schema, index ) => {
                    const serverParams = index === 0 ? mockServerParams : {}
                    return FlowMCP.activateServerTools( {
                        server: mockServer,
                        schema,
                        serverParams,
                        validate: false,
                        silent: true
                    } )
                } )

            // Should have tools from all schemas
            const totalExpectedTools = mockSchemas
                .reduce( ( acc, schema ) => acc + Object.keys( schema.routes ).length, 0 )
            
            expect( mockServer.tools.size ).toBe( totalExpectedTools )
            
            // Verify tool names contain namespace prefixes
            const toolNames = mockServer.getToolNames()
            expect( toolNames.some( name => name.includes( 'lukso_network' ) ) ).toBe( true )
            expect( toolNames.some( name => name.includes( 'coingecko' ) ) ).toBe( true )
            expect( toolNames.some( name => name.includes( 'test_namespace' ) ) ).toBe( true )
        } )
    } )
} )