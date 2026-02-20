import { FlowMCP } from '../../../src/v1/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Complex Scenarios & Edge Cases', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'combines all filter types: namespace + tags + routes', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'testNamespace', 'luksoNetwork' ],
            excludeNamespaces: [],
            activateTags: [ 'blockchain', 'luksoNetwork.!getTransactions' ]
        } )

        // Step 1: includeNamespaces filters to testNamespace + luksoNetwork  
        // Step 2: 'blockchain' tag filters - only luksoNetwork has blockchain tag
        // Step 3: 'luksoNetwork.!getTransactions' removes getTransactions from luksoNetwork
        
        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'luksoNetwork' )
        // testNamespace doesn't have blockchain tag, so it's filtered out
        
        expect( luksoSchema ).toBeDefined()
        // Only luksoNetwork should remain after blockchain tag filtering
        
        // luksoNetwork should have blockchain tag and exclude getTransactions
        expect( luksoSchema.tags ).toContain( 'blockchain' )
        expect( Object.keys( luksoSchema.routes ) ).not.toContain( 'getTransactions' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBlocks' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBalance' )
    } )


    it( 'combines filterTags and schemaFilters with different namespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'crypto', 'luksoNetwork.getBlocks' ]
        } )

        // Step 1: No namespace filtering
        // Step 2: 'crypto' tag filter - only coingecko has this tag
        // Step 3: 'luksoNetwork.getBlocks' route filter - only luksoNetwork with getBlocks route
        
        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'luksoNetwork' )
        const coingeckoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'coingecko' )
        
        expect( luksoSchema ).toBeDefined()
        expect( coingeckoSchema ).toBeDefined()
        
        // luksoNetwork should have only getBlocks route (route filter applied)
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBlocks' ] )
        
        // coingecko should have crypto tag and all routes (no route filter)
        expect( coingeckoSchema.tags ).toContain( 'crypto' )
        expect( Object.keys( coingeckoSchema.routes ) ).toHaveLength( 2 )
    } )


    it( 'handles mixed include and exclude route filters correctly', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'luksoNetwork.getBalance', 
                'luksoNetwork.!getTransactions',
                'coingecko.getPrice'
            ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'luksoNetwork' )
        const coingeckoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'coingecko' )
        
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBalance' ] )
        expect( Object.keys( coingeckoSchema.routes ) ).toEqual( [ 'getPrice' ] )
    } )


    it( 'throws error for empty input arrays', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [],
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'Missing or invalid arrayOfSchemas' )
    } )


    it( 'throws error when tag does not exist in complex combinations', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 
                    'nonExistentTag',
                    'luksoNetwork.!getBlocks',
                    'luksoNetwork.!getTransactions',
                    'luksoNetwork.!getBalance'
                ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )


    it( 'prioritizes exclude routes even when include routes are present', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'luksoNetwork.getBlocks',
                'luksoNetwork.getBalance',
                'luksoNetwork.!getBlocks'
            ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        
        const routes = Object.keys( filteredArrayOfSchemas[ 0 ].routes )
        expect( routes ).toEqual( [ 'getBalance' ] )
        expect( routes ).not.toContain( 'getBlocks' )
    } )


    it( 'throws error when tag does not exist in schemas with no tags', () => {
        const schemasWithNoTags = [
            {
                namespace: 'noTagsNamespace',
                tags: [],
                routes: {
                    'testRoute': { method: 'GET', path: '/test' }
                }
            }
        ]

        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: schemasWithNoTags,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'someTag' ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )


    it( 'preserves original schema structure when no filters applied', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        // Should return all schemas except those with empty routes
        const schemasWithRoutes = mockSchemas
            .filter( schema => Object.keys( schema.routes ).length > 0 )
        
        expect( filteredArrayOfSchemas ).toHaveLength( schemasWithRoutes.length )
        
        filteredArrayOfSchemas
            .forEach( ( schema ) => {
                const originalSchema = mockSchemas
                    .find( orig => orig.namespace === schema.namespace )
                
                expect( originalSchema ).toBeDefined()
                expect( schema.namespace ).toBe( originalSchema.namespace )
                expect( schema.tags ).toEqual( originalSchema.tags )
                expect( schema.routes ).toEqual( originalSchema.routes )
                expect( Object.keys( schema.routes ).length ).toBeGreaterThan( 0 )
            } )
    } )


    it( 'throws error for malformed activateTags', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'malformed.tag.with.too.many.dots' ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )


    it( 'throws error for activateTags with only dots', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ '.', '..', '...' ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )


    it( 'correctly handles duplicate activateTags', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'blockchain', 'blockchain', 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )  // Only luksoNetwork has blockchain tag
        
        filteredArrayOfSchemas
            .forEach( ( schema ) => {
                const hasBlockchainTag = schema.tags
                    .some( tag => tag.toLowerCase() === 'blockchain' )
                expect( hasBlockchainTag ).toBe( true )
            } )
    } )


    it( 'performance test: handles large arrays efficiently', () => {
        const largeSchemaArray = Array( 1000 )
            .fill( null )
            .map( ( _, index ) => ( {
                namespace: `namespace${index}`,
                tags: [ 'tag1', 'tag2' ],
                routes: {
                    'route1': { method: 'GET', path: '/route1' },
                    'route2': { method: 'POST', path: '/route2' }
                }
            } ) )

        const startTime = Date.now()
        
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: largeSchemaArray,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'tag1' ]
        } )
        
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect( filteredArrayOfSchemas ).toHaveLength( 1000 )
        expect( executionTime ).toBeLessThan( 1000 ) // Should complete within 1 second
    } )
} )