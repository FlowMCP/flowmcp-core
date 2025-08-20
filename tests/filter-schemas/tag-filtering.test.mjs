import { FlowMCP } from '../../src/index.mjs'
import { mockSchemas } from './mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Tag Filtering', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'filters by single tag - blockchain', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 4 )
        
        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).toContain( 'testNamespaceA' )
        expect( namespaces ).toContain( 'testNamespaceC' )
        expect( namespaces ).toContain( 'luksoNetwork' )
        expect( namespaces ).toContain( 'MixedCaseNamespace' )
        expect( namespaces ).not.toContain( 'testNamespaceB' )
    } )


    it( 'filters by single tag - dataProvider', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'dataProvider' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'testNamespaceB' )
    } )


    it( 'filters by multiple tags - OR logic', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'dataProvider', 'defi' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).toContain( 'testNamespaceB' )
        expect( namespaces ).toContain( 'testNamespaceC' )
    } )


    it( 'returns empty array when tag does not exist', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'nonExistentTag' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )


    it( 'handles case sensitivity correctly - lowercase', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 4 )
    } )


    it( 'handles case sensitivity correctly - uppercase', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 4 )
    } )


    it( 'handles case sensitivity correctly - mixed case', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'BlockChain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 4 )
    } )


    it( 'combines namespace include with tag filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'testNamespaceA', 'testNamespaceC' ],
            excludeNamespaces: [],
            activateTags: [ 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).toContain( 'testNamespaceA' )
        expect( namespaces ).toContain( 'testNamespaceC' )
        expect( namespaces ).not.toContain( 'luksoNetwork' )
    } )


    it( 'combines namespace exclude with tag filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [ 'luksoNetwork' ],
            activateTags: [ 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 3 )  // Including MixedCaseNamespace
        
        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).toContain( 'testNamespaceA' )
        expect( namespaces ).toContain( 'testNamespaceC' )
        expect( namespaces ).toContain( 'MixedCaseNamespace' )
        expect( namespaces ).not.toContain( 'luksoNetwork' )
    } )


    it( 'returns schemas without empty routes when activateTags is empty array', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        const expectedCount = mockSchemas
            .filter( schema => Object.keys( schema.routes ).length > 0 ).length
        
        expect( filteredArrayOfSchemas ).toHaveLength( expectedCount )
    } )


    it( 'filters out schemas with no matching tags but preserves route structure', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'blockchain' ]
        } )

        filteredArrayOfSchemas
            .forEach( ( schema ) => {
                const hasBlockchainTag = schema.tags
                    .some( tag => tag.toLowerCase() === 'blockchain' )
                expect( hasBlockchainTag ).toBe( true )
                expect( Object.keys( schema.routes ).length ).toBeGreaterThan( 0 )
            } )
    } )
} )