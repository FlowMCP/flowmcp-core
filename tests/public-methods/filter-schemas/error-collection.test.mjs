import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Error Collection & Reporting', () => {

    // Mock console.warn to capture error messages
    let consoleWarnSpy
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        consoleWarnSpy = []
        console.warn = ( ...args ) => {
            consoleWarnSpy.push( args.join( ' ' ) )
        }
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )


    it( 'collects errors for schemas with empty routes after filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'testNamespace' ],
            excludeNamespaces: [],
            activateTags: [ 'testNamespace.!testRoute' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 0 )
        expect( consoleWarnSpy.some( call => call.includes( "Schema 'testNamespace' has no routes after filtering" ) ) ).toBe( true )
    } )


    it( 'collects errors for invalid activateTags syntax', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'validTag',
                'invalid.tag.too.many.dots',
                '.emptyNamespace',
                'namespace.',
                'also.valid.route'
            ]
        } )

        expect( consoleWarnSpy.some( call => call.includes( "Invalid activateTags syntax: 'invalid.tag.too.many.dots'" ) ) ).toBe( true )
        expect( consoleWarnSpy.some( call => call.includes( "Invalid activateTags syntax: '.emptyNamespace'" ) ) ).toBe( true )
        expect( consoleWarnSpy.some( call => call.includes( "Invalid activateTags syntax: 'namespace.'" ) ) ).toBe( true )
    } )


    it( 'collects errors for non-existent namespaces in route filters', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'unknownNamespace.getBlocks',
                'anotherUnknown.getData',
                'luksoNetwork.getBlocks' // valid
            ]
        } )

        expect( consoleWarnSpy.some( call => call.includes( "Namespace 'unknownNamespace' not found in schemas" ) ) ).toBe( true )
        expect( consoleWarnSpy.some( call => call.includes( "Namespace 'anotherUnknown' not found in schemas" ) ) ).toBe( true )
    } )


    it( 'collects errors for non-existent routes in valid namespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'luksoNetwork.unknownRoute',
                'luksoNetwork.anotherUnknownRoute',
                'testNamespace.nonExistentMethod',
                'luksoNetwork.getBlocks' // valid
            ]
        } )

        expect( consoleWarnSpy.some( call => call.includes( "Route 'unknownroute' not found in namespace 'luksoNetwork'" ) ) ).toBe( true )
        expect( consoleWarnSpy.some( call => call.includes( "Route 'anotherunknownroute' not found in namespace 'luksoNetwork'" ) ) ).toBe( true )
        expect( consoleWarnSpy.some( call => call.includes( "Route 'nonexistentmethod' not found in namespace 'testNamespace'" ) ) ).toBe( true )
    } )


    it( 'collects multiple error types together', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'crypto',                            // OK - valid tag
                'invalid.syntax.too.many.dots',      // Error: invalid syntax
                'unknownNamespace.getBlocks',        // Error: unknown namespace
                'luksoNetwork.unknownRoute',         // Error: unknown route
                'testNamespace.!testRoute'           // Will cause empty routes error
            ]
        } )

        expect( consoleWarnSpy.some( call => 
            call.includes( 'Filtering completed with warnings:' )
        ) ).toBe( true )
        
        const warningCall = consoleWarnSpy.find( call => 
            call.includes( 'Filtering completed with warnings:' )
        )
        
        expect( warningCall ).toContain( "Invalid activateTags syntax: 'invalid.syntax.too.many.dots'" )
        expect( warningCall ).toContain( "Namespace 'unknownNamespace' not found in schemas" )
        expect( warningCall ).toContain( "Route 'unknownroute' not found in namespace 'luksoNetwork'" )
        expect( warningCall ).toContain( "Schema 'testNamespace' has no routes after filtering" )
    } )


    it( 'does not show warnings when no errors occur', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'blockchain',
                'luksoNetwork.getBlocks'
            ]
        } )

        expect( filteredArrayOfSchemas.length ).toBeGreaterThan( 0 )
        expect( consoleWarnSpy ).toHaveLength( 0 )
    } )


    it( 'shows filtered count in warning message', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 
                'blockchain',
                'unknownNamespace.route'  // Will cause warning
            ]
        } )

        const successfulCount = filteredArrayOfSchemas.length
        
        expect( consoleWarnSpy.some( call => call.includes( `Filtered ${successfulCount} schemas successfully.` ) ) ).toBe( true )
    } )
} )