import { FlowMCP } from '../../src/index.mjs'
import { mockSchemas } from './mock-schemas.mjs'


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
            includeNamespaces: [ 'testNamespaceA', 'luksoNetwork' ],
            excludeNamespaces: [],
            activateTags: [ 'blockchain', 'luksoNetwork.!getBlockTransactions' ]
        } )

        // Step 1: includeNamespaces filters to testNamespaceA + luksoNetwork  
        // Step 2: 'blockchain' tag filters - both have blockchain tag
        // Step 3: 'luksoNetwork.!getBlockTransactions' removes getBlockTransactions from luksoNetwork
        
        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'luksoNetwork' )
        const testSchemaA = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'testNamespaceA' )
        
        expect( luksoSchema ).toBeDefined()
        expect( testSchemaA ).toBeDefined()
        
        // luksoNetwork should have blockchain tag and exclude getBlockTransactions
        expect( luksoSchema.tags ).toContain( 'blockchain' )
        expect( Object.keys( luksoSchema.routes ) ).not.toContain( 'getBlockTransactions' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBlocks' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBalance' )
        
        // testNamespaceA should have blockchain tag and all routes (no route filter applied)
        expect( testSchemaA.tags ).toContain( 'blockchain' )
        expect( Object.keys( testSchemaA.routes ) ).toHaveLength( 3 )
    } )


    it( 'combines filterTags and schemaFilters with different namespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'dataProvider', 'luksoNetwork.getBlocks' ]
        } )

        // Step 1: No namespace filtering
        // Step 2: 'dataProvider' tag filter - only testNamespaceB has this tag
        // Step 3: 'luksoNetwork.getBlocks' route filter - only luksoNetwork with getBlocks route
        
        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'luksoNetwork' )
        const testSchemaB = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'testNamespaceB' )
        
        expect( luksoSchema ).toBeDefined()
        expect( testSchemaB ).toBeDefined()
        
        // luksoNetwork should have only getBlocks route (route filter applied)
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBlocks' ] )
        
        // testNamespaceB should have dataProvider tag and all routes (no route filter)
        expect( testSchemaB.tags ).toContain( 'dataProvider' )
        expect( Object.keys( testSchemaB.routes ) ).toHaveLength( 2 )
    } )


    it( 'handles mixed include and exclude route filters correctly', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'testNamespaceA.getBalance', 
                'testNamespaceA.!sendTransaction',
                'testNamespaceC.getPrice'
            ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const testSchemaA = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'testNamespaceA' )
        const testSchemaC = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'testNamespaceC' )
        
        expect( Object.keys( testSchemaA.routes ) ).toEqual( [ 'getBalance' ] )
        expect( Object.keys( testSchemaC.routes ) ).toEqual( [ 'getPrice' ] )
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


    it( 'handles complex tag and route combinations that result in empty schemas', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'nonExistentTag',
                'luksoNetwork.!getBlocks',
                'luksoNetwork.!getBlockTransactions',
                'luksoNetwork.!getBalance'
            ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
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


    it( 'handles schemas with no tags when filterTags are specified', () => {
        const schemasWithNoTags = [
            {
                namespace: 'noTagsNamespace',
                tags: [],
                routes: {
                    'testRoute': { method: 'GET', path: '/test' }
                }
            }
        ]

        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: schemasWithNoTags,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'someTag' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
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


    it( 'handles malformed activateTags gracefully', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'malformed.tag.with.too.many.dots' ]
        } )

        // Invalid tags are ignored, so all schemas (except empty routes) should be returned
        const expectedCount = mockSchemas
            .filter( schema => Object.keys( schema.routes ).length > 0 ).length
        
        expect( filteredArrayOfSchemas ).toHaveLength( expectedCount )
    } )


    it( 'handles activateTags with only dots', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ '.', '..', '...' ]
        } )

        // Invalid tags are ignored, so all schemas (except empty routes) should be returned
        const expectedCount = mockSchemas
            .filter( schema => Object.keys( schema.routes ).length > 0 ).length
        
        expect( filteredArrayOfSchemas ).toHaveLength( expectedCount )
    } )


    it( 'correctly handles duplicate activateTags', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'blockchain', 'blockchain', 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 4 )  // Including MixedCaseNamespace with BLOCKCHAIN tag
        
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