import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Route Filtering (schemaFilters)', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'includes specific routes with namespace.routeName syntax', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.getBlocks' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        expect( Object.keys( filteredArrayOfSchemas[ 0 ].routes ) ).toEqual( [ 'getBlocks' ] )
        expect( filteredArrayOfSchemas[ 0 ].routes ).toHaveProperty( 'getBlocks' )
        expect( filteredArrayOfSchemas[ 0 ].routes ).not.toHaveProperty( 'getBlockTransactions' )
        expect( filteredArrayOfSchemas[ 0 ].routes ).not.toHaveProperty( 'getBalance' )
    } )


    it( 'includes multiple specific routes from same namespace', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.getBlocks', 'luksoNetwork.getBalance' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        
        const routes = Object.keys( filteredArrayOfSchemas[ 0 ].routes )
        expect( routes ).toHaveLength( 2 )
        expect( routes ).toContain( 'getBlocks' )
        expect( routes ).toContain( 'getBalance' )
        expect( routes ).not.toContain( 'getBlockTransactions' )
    } )


    it( 'excludes specific routes with ! prefix', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.!getBlocks' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        
        const routes = Object.keys( filteredArrayOfSchemas[ 0 ].routes )
        expect( routes ).toHaveLength( 2 )
        expect( routes ).toContain( 'getBalance' )
        expect( routes ).toContain( 'getTransactions' )
        expect( routes ).not.toContain( 'getBlocks' )
    } )


    it( 'excludes multiple specific routes with ! prefix', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.!getBlocks', 'luksoNetwork.!getTransactions' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        
        const routes = Object.keys( filteredArrayOfSchemas[ 0 ].routes )
        expect( routes ).toHaveLength( 1 )
        expect( routes ).toContain( 'getBalance' )
        expect( routes ).not.toContain( 'getBlocks' )
        expect( routes ).not.toContain( 'getTransactions' )
    } )


    it( 'combines include and exclude routes - exclude takes priority', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.getBlocks', 'luksoNetwork.!getBlocks' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )


    it( 'filters routes from multiple namespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.getBlocks', 'testNamespace.testRoute' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'luksoNetwork' )
        const testSchema = filteredArrayOfSchemas
            .find( ( schema ) => schema.namespace === 'testNamespace' )
        
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBlocks' ] )
        expect( Object.keys( testSchema.routes ) ).toEqual( [ 'testRoute' ] )
    } )


    it( 'handles case sensitivity in route names', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.GETBLOCKS' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        expect( Object.keys( filteredArrayOfSchemas[ 0 ].routes ) ).toEqual( [ 'getBlocks' ] )
    } )


    it( 'throws error when namespace in schemaFilter does not exist', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'nonExistentNamespace.someRoute' ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )


    it( 'throws error when route in schemaFilter does not exist', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'luksoNetwork.nonExistentRoute' ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )


    it( 'filters out schemas with empty routes after route filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.!getBlocks', 'luksoNetwork.!getTransactions', 'luksoNetwork.!getBalance' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )


    it( 'preserves original route structure and metadata', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.getBlocks' ]
        } )

        const route = filteredArrayOfSchemas[ 0 ].routes.getBlocks
        expect( route ).toHaveProperty( 'requestMethod', 'GET' )
        expect( route ).toHaveProperty( 'route', '/blocks' )
        expect( route ).toHaveProperty( 'description' )
        expect( route ).toHaveProperty( 'parameters' )
        expect( route ).toHaveProperty( 'tests' )
        expect( route ).toHaveProperty( 'modifiers' )
    } )


    it( 'combines namespace filtering with route filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'luksoNetwork' ],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.getBlocks' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        expect( filteredArrayOfSchemas[ 0 ].namespace ).toBe( 'luksoNetwork' )
        expect( Object.keys( filteredArrayOfSchemas[ 0 ].routes ) ).toEqual( [ 'getBlocks' ] )
    } )


    it( 'ignores namespace in activateTags when namespace is excluded', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [ 'luksoNetwork' ],
            activateTags: [ 'luksoNetwork.getBlocks' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )
} )