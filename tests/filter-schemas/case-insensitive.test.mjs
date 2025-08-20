import { FlowMCP } from '../../src/index.mjs'
import { mockSchemas } from './mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Case-Insensitive Behavior', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'handles case-insensitive namespace filtering - includeNamespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'LUKSONETWORK', 'mixedcasenamespace' ],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const namespaces = filteredArrayOfSchemas
            .map( schema => schema.namespace )
        
        expect( namespaces ).toContain( 'luksoNetwork' )
        expect( namespaces ).toContain( 'MixedCaseNamespace' )
    } )


    it( 'handles case-insensitive namespace filtering - excludeNamespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [ 'LUKSONETWORK', 'MIXEDCASENAMESPACE' ],
            activateTags: []
        } )

        const namespaces = filteredArrayOfSchemas
            .map( schema => schema.namespace )
        
        expect( namespaces ).not.toContain( 'luksoNetwork' )
        expect( namespaces ).not.toContain( 'MixedCaseNamespace' )
        expect( namespaces ).toContain( 'testNamespaceA' )
    } )


    it( 'handles case-insensitive tag filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN', 'testtag' ]
        } )

        expect( filteredArrayOfSchemas.length ).toBeGreaterThan( 0 )
        
        filteredArrayOfSchemas
            .forEach( schema => {
                const hasBlockchainTag = schema.tags
                    .some( tag => tag.toLowerCase() === 'blockchain' )
                const hasTestTag = schema.tags
                    .some( tag => tag.toLowerCase() === 'testtag' )
                
                expect( hasBlockchainTag || hasTestTag ).toBe( true )
            } )
    } )


    it( 'handles case-insensitive route filtering - namespace part', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'LUKSONETWORK.getBlocks', 'mixedcasenamespace.GetData' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        const mixedCaseSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'MixedCaseNamespace' )
        
        expect( luksoSchema ).toBeDefined()
        expect( mixedCaseSchema ).toBeDefined()
        
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBlocks' ] )
        expect( Object.keys( mixedCaseSchema.routes ) ).toEqual( [ 'GetData' ] )
    } )


    it( 'handles case-insensitive route filtering - route part', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.GETBLOCKS', 'MixedCaseNamespace.getdata' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        const mixedCaseSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'MixedCaseNamespace' )
        
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBlocks' ] )
        expect( Object.keys( mixedCaseSchema.routes ) ).toEqual( [ 'GetData' ] )
    } )


    it( 'handles case-insensitive exclude route filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'LUKSONETWORK.!GETBLOCKS', 'mixedcasenamespace.!POSTDATA' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        const mixedCaseSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'MixedCaseNamespace' )
        
        expect( Object.keys( luksoSchema.routes ) ).not.toContain( 'getBlocks' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBlockTransactions' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBalance' )
        
        expect( Object.keys( mixedCaseSchema.routes ) ).not.toContain( 'PostData' )
        expect( Object.keys( mixedCaseSchema.routes ) ).toContain( 'GetData' )
    } )


    it( 'preserves original case in returned schemas', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'MIXEDCASENAMESPACE' ],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        
        const schema = filteredArrayOfSchemas[ 0 ]
        
        // Original case should be preserved
        expect( schema.namespace ).toBe( 'MixedCaseNamespace' )
        expect( schema.tags ).toContain( 'BLOCKCHAIN' )
        expect( schema.tags ).toContain( 'TestTag' )
        expect( Object.keys( schema.routes ) ).toContain( 'GetData' )
        expect( Object.keys( schema.routes ) ).toContain( 'PostData' )
    } )


    it( 'combines case-insensitive filtering with multiple filter types', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'LUKSONETWORK', 'MIXEDCASENAMESPACE' ],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN', 'luksonetwork.!GETBLOCKTRANSACTIONS' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        const mixedCaseSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'MixedCaseNamespace' )
        
        expect( luksoSchema ).toBeDefined()
        expect( mixedCaseSchema ).toBeDefined()
        
        // luksoNetwork should have blockchain tag AND exclude getBlockTransactions
        expect( luksoSchema.tags ).toContain( 'blockchain' )
        expect( Object.keys( luksoSchema.routes ) ).not.toContain( 'getBlockTransactions' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBlocks' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBalance' )
        
        // MixedCaseNamespace should have BLOCKCHAIN tag
        expect( mixedCaseSchema.tags ).toContain( 'BLOCKCHAIN' )
        expect( Object.keys( mixedCaseSchema.routes ) ).toContain( 'GetData' )
        expect( Object.keys( mixedCaseSchema.routes ) ).toContain( 'PostData' )
    } )
} )