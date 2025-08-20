import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.getAllTests', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'extracts all tests from schema routes', () => {
        const result = FlowMCP.getAllTests( {
            schema: mockSchemas[ 0 ] // luksoNetwork with 3 routes, each with 1 test
        } )

        expect( result ).toBeDefined()
        expect( Array.isArray( result ) ).toBe( true )
        expect( result ).toHaveLength( 3 )
        
        // Check test structure
        result
            .forEach( ( test ) => {
                expect( test ).toHaveProperty( 'routeName' )
                expect( test ).toHaveProperty( 'description' )
                expect( test ).toHaveProperty( 'userParams' )
            } )
    } )

    it( 'includes route name with each test', () => {
        const result = FlowMCP.getAllTests( {
            schema: mockSchemas[ 0 ]
        } )

        const routeNames = result.map( test => test.routeName )
        expect( routeNames ).toContain( 'getBlocks' )
        expect( routeNames ).toContain( 'getBalance' )
        expect( routeNames ).toContain( 'getTransactions' )
    } )

    it( 'preserves test descriptions', () => {
        const result = FlowMCP.getAllTests( {
            schema: mockSchemas[ 0 ]
        } )

        const getBlocksTest = result.find( test => test.routeName === 'getBlocks' )
        expect( getBlocksTest.description ).toBe( 'Get 10 blocks' )
        
        const getBalanceTest = result.find( test => test.routeName === 'getBalance' )
        expect( getBalanceTest.description ).toBe( 'Get balance for address' )
    } )

    it( 'includes all test parameters', () => {
        const result = FlowMCP.getAllTests( {
            schema: mockSchemas[ 0 ]
        } )

        const getBlocksTest = result.find( test => test.routeName === 'getBlocks' )
        expect( getBlocksTest.userParams ).toHaveProperty( 'limit', 10 )
        
        const getBalanceTest = result.find( test => test.routeName === 'getBalance' )
        expect( getBalanceTest.userParams ).toHaveProperty( 'address', '0x1234567890123456789012345678901234567890' )
        
        const getTransactionsTest = result.find( test => test.routeName === 'getTransactions' )
        expect( getTransactionsTest.userParams ).toHaveProperty( 'from' )
        expect( getTransactionsTest.userParams ).toHaveProperty( 'to' )
    } )

    it( 'handles multiple tests per route', () => {
        const schemaWithMultipleTests = {
            ...mockSchemas[ 0 ],
            routes: {
                testRoute: {
                    requestMethod: 'GET',
                    description: 'Test route with multiple tests',
                    route: '/test',
                    parameters: [
                        { position: { key: 'param', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [] } }
                    ],
                    tests: [
                        { _description: 'First test', param: 'value1' },
                        { _description: 'Second test', param: 'value2' },
                        { _description: 'Third test', param: 'value3' }
                    ],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.getAllTests( {
            schema: schemaWithMultipleTests
        } )

        expect( result ).toHaveLength( 3 )
        expect( result[ 0 ].routeName ).toBe( 'testRoute' )
        expect( result[ 1 ].routeName ).toBe( 'testRoute' )
        expect( result[ 2 ].routeName ).toBe( 'testRoute' )
        
        expect( result[ 0 ].description ).toBe( 'First test' )
        expect( result[ 1 ].description ).toBe( 'Second test' )
        expect( result[ 2 ].description ).toBe( 'Third test' )
    } )

    it( 'handles routes with no tests', () => {
        const schemaWithoutTests = {
            ...mockSchemas[ 0 ],
            routes: {
                routeWithoutTests: {
                    requestMethod: 'GET',
                    description: 'Route without tests',
                    route: '/no-tests',
                    parameters: [],
                    tests: [],
                    modifiers: []
                }
            }
        }

        const result = FlowMCP.getAllTests( {
            schema: schemaWithoutTests
        } )

        expect( result ).toHaveLength( 0 )
    } )

    it( 'handles empty routes object', () => {
        const schemaWithoutRoutes = {
            ...mockSchemas[ 0 ],
            routes: {}
        }

        const result = FlowMCP.getAllTests( {
            schema: schemaWithoutRoutes
        } )

        expect( result ).toHaveLength( 0 )
    } )

    it( 'throws error when schema validation fails', () => {
        expect( () => {
            FlowMCP.getAllTests( {
                schema: { invalid: 'schema' }
            } )
        } ).toThrow()
    } )

    it( 'handles complex test data structures', () => {
        const result = FlowMCP.getAllTests( {
            schema: mockSchemas[ 1 ] // coingecko schema
        } )

        expect( result ).toHaveLength( 2 )
        
        const getPriceTest = result.find( test => test.routeName === 'getPrice' )
        expect( getPriceTest.userParams ).toHaveProperty( 'ids', 'bitcoin' )
        expect( getPriceTest.userParams ).toHaveProperty( 'vs_currencies', 'usd' )
        
        const getMarketsTest = result.find( test => test.routeName === 'getMarkets' )
        expect( getMarketsTest.userParams ).toHaveProperty( 'vs_currency', 'usd' )
        expect( getMarketsTest.userParams ).toHaveProperty( 'per_page', 100 )
    } )

    it( 'preserves test data object structure', () => {
        const result = FlowMCP.getAllTests( {
            schema: mockSchemas[ 0 ]
        } )

        result
            .forEach( ( test ) => {
                expect( typeof test.userParams ).toBe( 'object' )
                expect( test.userParams ).not.toBe( null )
                expect( typeof test.description ).toBe( 'string' )
                expect( test.description.length ).toBeGreaterThan( 0 )
            } )
    } )

    it( 'handles different parameter types in tests', () => {
        const result = FlowMCP.getAllTests( {
            schema: mockSchemas[ 0 ]
        } )

        const getBlocksTest = result.find( test => test.routeName === 'getBlocks' )
        expect( typeof getBlocksTest.userParams.limit ).toBe( 'number' )
        
        const getBalanceTest = result.find( test => test.routeName === 'getBalance' )
        expect( typeof getBalanceTest.userParams.address ).toBe( 'string' )
    } )

    describe( 'test data integrity', () => {
        it( 'maintains original test parameter values', () => {
            const result = FlowMCP.getAllTests( {
                schema: mockSchemas[ 0 ]
            } )

            const getTransactionsTest = result.find( test => test.routeName === 'getTransactions' )
            expect( getTransactionsTest.userParams.from ).toBe( '0x1111111111111111111111111111111111111111' )
            expect( getTransactionsTest.userParams.to ).toBe( '0x2222222222222222222222222222222222222222' )
        } )

        it( 'does not modify original schema', () => {
            const originalSchema = JSON.parse( JSON.stringify( mockSchemas[ 0 ] ) )
            
            FlowMCP.getAllTests( {
                schema: mockSchemas[ 0 ]
            } )

            expect( mockSchemas[ 0 ] ).toEqual( originalSchema )
        } )

        it( 'returns independent test objects', () => {
            const result = FlowMCP.getAllTests( {
                schema: mockSchemas[ 0 ]
            } )

            const test1 = result[ 0 ]
            const test2 = result[ 1 ]
            
            expect( test1 ).not.toBe( test2 )
            expect( test1.userParams ).not.toBe( test2.userParams )
        } )
    } )
} )