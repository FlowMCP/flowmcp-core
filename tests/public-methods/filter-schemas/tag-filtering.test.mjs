import { FlowMCP } from '../../../src/v1/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


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

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        
        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).toContain( 'luksoNetwork' )
    } )


    it( 'filters by single tag - crypto', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'crypto' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'coingecko' )
    } )


    it( 'filters by multiple tags - OR logic', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'crypto', 'test' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const namespaces = filteredArrayOfSchemas
            .map( ( schema ) => schema.namespace )
        
        expect( namespaces ).toContain( 'coingecko' )
        expect( namespaces ).toContain( 'testNamespace' )
    } )


    it( 'throws error when tag does not exist', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'nonExistentTag' ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )


    it( 'handles case sensitivity correctly - lowercase', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
    } )


    it( 'handles case sensitivity correctly - uppercase', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
    } )


    it( 'handles case sensitivity correctly - mixed case', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'BlockChain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
    } )


    it( 'combines namespace include with tag filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'testNamespaceA', 'testNamespaceC' ],
            excludeNamespaces: [],
            activateTags: [ 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )


    it( 'combines namespace exclude with tag filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [ 'luksoNetwork' ],
            activateTags: [ 'blockchain' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
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