import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Error Collection & Throwing', () => {

    it( 'filters out schemas with empty routes after filtering', () => {
        // This test validates that when all routes are excluded, the schema is filtered out
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'testNamespace' ],
            excludeNamespaces: [],
            activateTags: [ 'testNamespace.!testRoute' ]
        } )

        // Should return empty array since all routes are excluded
        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
    } )


    it( 'throws error for invalid activateTags syntax', () => {
        let caughtError
        
        try {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 
                    'blockchain',  // valid tag
                    'invalid.tag.too.many.dots',
                    '.emptyNamespace',
                    'namespace.'
                ]
            } )
        } catch( error ) {
            caughtError = error
        }

        expect( caughtError ).toBeDefined()
        expect( caughtError.message ).toContain( 'Invalid activateTags found' )
        expect( caughtError.message ).toContain( "Invalid activateTags syntax: 'invalid.tag.too.many.dots'" )
        expect( caughtError.message ).toContain( "Invalid activateTags syntax: '.emptyNamespace'" )
        expect( caughtError.message ).toContain( "Invalid activateTags syntax: 'namespace.'" )
    } )


    it( 'throws error for non-existent namespaces in route filters', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 
                    'unknownNamespace.getBlocks',
                    'anotherUnknown.getData'
                ]
            } )
        } ).toThrow( /Invalid activateTags found.*Namespace 'unknownNamespace' not found in schemas.*Namespace 'anotherUnknown' not found in schemas/s )
    } )


    it( 'throws error for non-existent routes in valid namespaces', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 
                    'luksoNetwork.unknownRoute',
                    'luksoNetwork.anotherUnknownRoute',
                    'testNamespace.nonExistentMethod'
                ]
            } )
        } ).toThrow( /Invalid activateTags found.*Route 'unknownroute' not found in namespace 'luksoNetwork'.*Route 'anotherunknownroute' not found in namespace 'luksoNetwork'.*Route 'nonexistentmethod' not found in namespace 'testNamespace'/s )
    } )


    it( 'throws error with multiple error types together', () => {
        let caughtError
        
        try {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 
                    'invalid.syntax.too.many.dots',      // Error: invalid syntax
                    'unknownNamespace.getBlocks',        // Error: unknown namespace
                    'luksoNetwork.unknownRoute'          // Error: unknown route
                ]
            } )
        } catch( error ) {
            caughtError = error
        }

        expect( caughtError ).toBeDefined()
        expect( caughtError.message ).toContain( 'Invalid activateTags found' )
        expect( caughtError.message ).toContain( "Invalid activateTags syntax: 'invalid.syntax.too.many.dots'" )
        expect( caughtError.message ).toContain( "Namespace 'unknownNamespace' not found in schemas" )
        expect( caughtError.message ).toContain( "Route 'unknownroute' not found in namespace 'luksoNetwork'" )
    } )


    it( 'does not throw errors when no invalid tags are provided', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'blockchain',
                'luksoNetwork.getBlocks'
            ]
        } )

        // Should work without throwing errors
        expect( filteredArrayOfSchemas.length ).toBeGreaterThan( 0 )
    } )


    it( 'throws error immediately and does not return partial results', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: mockSchemas,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 
                    'blockchain',                // Valid
                    'unknownNamespace.route'     // Invalid - should cause error
                ]
            } )
        } ).toThrow( 'Invalid activateTags found' )
    } )
} )