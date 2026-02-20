import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'
import { FlowMCP } from '../../../src/v1/index.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Issue #36 Edge Case', () => {
    let originalWarn
    
    beforeAll( () => {
        // Suppress console.warn for these tests
        originalWarn = console.warn
        console.warn = jest.fn()
    } )
    
    afterAll( () => {
        // Restore console.warn
        console.warn = originalWarn
    } )
    // Edge case: Multiple schemas with the same namespace, filtering for specific routes
    const multipleCoingeckoSchemas = [
        {
            namespace: 'coingecko',
            tags: [ 'crypto', 'price' ],
            routes: {
                getCurrentPrice: { /* route details */ },
                getHistoricalData: { /* route details */ },
                getMarketData: { /* route details */ }
            }
        },
        {
            namespace: 'coingecko',
            tags: [ 'crypto', 'volume' ],
            routes: {
                getVolume: { /* route details */ },
                getTrades: { /* route details */ }
            }
        },
        {
            namespace: 'coingecko',
            tags: [ 'crypto', 'exchanges' ],
            routes: {
                getExchanges: { /* route details */ },
                getExchangeData: { /* route details */ }
            }
        },
        {
            namespace: 'coingecko',
            tags: [ 'crypto', 'market' ],
            routes: {
                getMarketCap: { /* route details */ },
                getTickers: { /* route details */ }
            }
        },
        {
            namespace: 'coingecko',
            tags: [ 'crypto', 'defi' ],
            routes: {
                getDefiData: { /* route details */ },
                getDefiProtocols: { /* route details */ }
            }
        },
        {
            namespace: 'coingecko',
            tags: [ 'crypto', 'nft' ],
            routes: {
                getNFTData: { /* route details */ },
                getNFTCollections: { /* route details */ }
            }
        },
        {
            namespace: 'coingecko',
            tags: [ 'crypto', 'derivatives' ],
            routes: {
                getDerivatives: { /* route details */ },
                getFutures: { /* route details */ }
            }
        },
        {
            namespace: 'otherApi',
            tags: [ 'data' ],
            routes: {
                getData: { /* route details */ }
            }
        }
    ]

    it( 'filters single route from multiple schemas with same namespace', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: multipleCoingeckoSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'coingecko.getCurrentPrice' ]
        } )

        // Should return exactly 1 schema
        expect( filteredArrayOfSchemas.length ).toBe( 1 )
        
        // The returned schema should be the one containing getCurrentPrice
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'coingecko' )
        expect( Object.keys( filteredArrayOfSchemas[ 0 ].routes ) ).toEqual( [ 'getCurrentPrice' ] )
        
        // Count total routes - should be exactly 1
        const totalRoutes = filteredArrayOfSchemas
            .reduce( ( sum, schema ) => sum + Object.keys( schema.routes ).length, 0 )
        expect( totalRoutes ).toBe( 1 )
    } )

    it( 'filters multiple specific routes from different schemas', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: multipleCoingeckoSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'coingecko.getCurrentPrice',
                'coingecko.getVolume',
                'coingecko.getNFTData'
            ]
        } )

        // Should return exactly 3 schemas (one for each route that exists)
        expect( filteredArrayOfSchemas.length ).toBe( 3 )
        
        // Collect all route names
        const allRoutes = filteredArrayOfSchemas
            .flatMap( schema => Object.keys( schema.routes ) )
        
        // Should have exactly these 3 routes
        expect( allRoutes.sort() ).toEqual( [ 'getCurrentPrice', 'getNFTData', 'getVolume' ] )
        expect( allRoutes.length ).toBe( 3 )
    } )

    it( 'throws error when filtering for non-existent route', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: multipleCoingeckoSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'coingecko.nonExistentRoute' ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )

    it( 'handles case-insensitive route filtering with multiple schemas', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: multipleCoingeckoSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'COINGECKO.GETCURRENTPRICE' ]
        } )

        // Should still find the route despite case difference
        expect( filteredArrayOfSchemas.length ).toBe( 1 )
        expect( Object.keys( filteredArrayOfSchemas[ 0 ].routes ) ).toEqual( [ 'getCurrentPrice' ] )
    } )

    it( 'combines namespace filtering with specific route filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: multipleCoingeckoSchemas,
            includeNamespaces: [ 'coingecko' ],
            excludeNamespaces: [],
            activateTags: [ 'coingecko.getVolume' ]
        } )

        // Should return only the schema with getVolume
        expect( filteredArrayOfSchemas.length ).toBe( 1 )
        expect( Object.keys( filteredArrayOfSchemas[ 0 ].routes ) ).toEqual( [ 'getVolume' ] )
    } )

    it( 'excludes specific routes while keeping others in same schema', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: multipleCoingeckoSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'coingecko.getCurrentPrice',
                'coingecko.getHistoricalData',
                'coingecko.!getMarketData'  // Exclude this one
            ]
        } )

        // Should return 1 schema with 2 routes (getCurrentPrice and getHistoricalData)
        expect( filteredArrayOfSchemas.length ).toBe( 1 )
        const routes = Object.keys( filteredArrayOfSchemas[ 0 ].routes )
        expect( routes.sort() ).toEqual( [ 'getCurrentPrice', 'getHistoricalData' ] )
        expect( routes ).not.toContain( 'getMarketData' )
    } )

    it( 'handles mixed schemas with different namespaces correctly', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: multipleCoingeckoSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'coingecko.getCurrentPrice',
                'otherApi.getData'
            ]
        } )

        // Should return 2 schemas (one coingecko, one otherApi)
        expect( filteredArrayOfSchemas.length ).toBe( 2 )
        
        const coingeckoSchema = filteredArrayOfSchemas.find( s => s.namespace === 'coingecko' )
        const otherApiSchema = filteredArrayOfSchemas.find( s => s.namespace === 'otherApi' )
        
        expect( coingeckoSchema ).toBeDefined()
        expect( otherApiSchema ).toBeDefined()
        expect( Object.keys( coingeckoSchema.routes ) ).toEqual( [ 'getCurrentPrice' ] )
        expect( Object.keys( otherApiSchema.routes ) ).toEqual( [ 'getData' ] )
    } )

    it( 'throws error with correct message for non-existent routes', () => {
        let caughtError
        
        try {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: multipleCoingeckoSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'coingecko.nonExistentRoute' ]
            } )
        } catch( error ) {
            caughtError = error
        }

        // Should throw error with correct message
        expect( caughtError ).toBeDefined()
        expect( caughtError.message ).toContain( 'Invalid activateTags found' )
        expect( caughtError.message ).toContain( "Route 'nonexistentroute' not found in namespace 'coingecko'" )
    } )
} )