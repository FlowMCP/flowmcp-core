import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Basic Namespace Filtering', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'filters by includeNamespaces - single namespace', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'luksoNetwork' ],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        expect( Object.keys( filteredArrayOfSchemas[ 0 ].routes ) ).toHaveLength( 3 )
    } )


    it( 'filters by includeNamespaces - multiple namespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'luksoNetwork', 'coingecko' ],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).toContain( 'luksoNetwork' )
        expect( namespaces ).toContain( 'coingecko' )
        expect( namespaces ).not.toContain( 'testNamespace' )
    } )


    it( 'filters by excludeNamespaces - single namespace', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [ 'luksoNetwork' ],
            activateTags: []
        } )

        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).not.toContain( 'luksoNetwork' )
        
        // Should exclude luksoNetwork but also filter out empty routes schemas
        const expectedCount = mockSchemas
            .filter( schema => 
                schema.namespace !== 'luksoNetwork' && 
                Object.keys( schema.routes ).length > 0 
            ).length
        
        expect( filteredArrayOfSchemas.length ).toBe( expectedCount )
    } )


    it( 'filters by excludeNamespaces - multiple namespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [ 'luksoNetwork', 'testNamespace' ],
            activateTags: []
        } )

        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).not.toContain( 'luksoNetwork' )
        expect( namespaces ).not.toContain( 'testNamespace' )
        expect( namespaces ).toContain( 'coingecko' )
    } )


    it( 'returns schemas without empty routes when no filters applied', () => {
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
                expect( Object.keys( schema.routes ).length ).toBeGreaterThan( 0 )
            } )
    } )


    it( 'returns empty array when includeNamespaces has non-existent namespace', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'nonExistentNamespace' ],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )


    it( 'handles empty includeNamespaces array correctly', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        // Should return all schemas except those with empty routes
        const expectedCount = mockSchemas
            .filter( schema => Object.keys( schema.routes ).length > 0 ).length
        
        expect( filteredArrayOfSchemas ).toHaveLength( expectedCount )
    } )


    it( 'ignores excludeNamespaces when includeNamespaces is specified', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'luksoNetwork' ],
            excludeNamespaces: [ 'luksoNetwork' ], // should be ignored
            activateTags: []
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
    } )


    it( 'filters out schemas with empty routes after filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'emptyRoutes' ],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )
} )