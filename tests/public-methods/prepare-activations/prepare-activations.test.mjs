import { FlowMCP } from '../../../src/v1/index.mjs'
import { mockSchemas, mockServerParams, invalidSchema } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.prepareActivations', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'successfully prepares activations with valid schemas and environment', () => {
        const { activationPayloads } = FlowMCP.prepareActivations( {
            arrayOfSchemas: mockSchemas,
            envObject: mockServerParams
        } )

        expect( activationPayloads ).toBeDefined()
        expect( Array.isArray( activationPayloads ) ).toBe( true )
        expect( activationPayloads.length ).toBeGreaterThan( 0 )
        
        // Check first activation payload structure  
        const firstPayload = activationPayloads[ 0 ]
        expect( firstPayload ).toHaveProperty( 'messages' )
        expect( firstPayload ).toHaveProperty( 'schema' )
        expect( firstPayload ).toHaveProperty( 'serverParams' )
        expect( firstPayload.schema ).toHaveProperty( 'namespace' )
        expect( firstPayload.schema ).toHaveProperty( 'routes' )
    } )

    it( 'throws error when schema validation fails', () => {
        const reallyInvalidSchema = null // This will definitely cause validation to fail
        
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: [ reallyInvalidSchema ],
                envObject: {}
            } )
        } ).toThrow()
    } )

    it( 'throws error when required server parameters are missing', () => {
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: [ mockSchemas[ 0 ] ], // luksoNetwork requires API_KEY
                envObject: {} // Empty environment object
            } )
        } ).toThrow( 'Activation preparation failed' )
    } )

    it( 'works with schemas that have no required server params', () => {
        const schemaWithoutParams = mockSchemas.find( schema => 
            schema.requiredServerParams.length === 0 
        )

        const { activationPayloads } = FlowMCP.prepareActivations( {
            arrayOfSchemas: [ schemaWithoutParams ],
            envObject: {}
        } )

        expect( activationPayloads ).toBeDefined()
        expect( activationPayloads.length ).toBeGreaterThan( 0 )
    } )

    it( 'throws error when deprecated parameters are used', () => {
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: mockSchemas,
                envObject: mockServerParams,
                activateTags: [ 'blockchain' ]
            } )
        } ).toThrow( /deprecated.*filterArrayOfSchema/ )

        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: mockSchemas,
                envObject: mockServerParams,
                includeNamespaces: [ 'luksoNetwork' ]
            } )
        } ).toThrow( /deprecated.*filterArrayOfSchema/ )

        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: mockSchemas,
                envObject: mockServerParams,
                excludeNamespaces: [ 'testNamespace' ]
            } )
        } ).toThrow( /deprecated.*filterArrayOfSchema/ )
    } )

    it( 'returns activation payloads with correct structure', () => {
        const { activationPayloads } = FlowMCP.prepareActivations( {
            arrayOfSchemas: [ mockSchemas[ 1 ] ], // coingecko schema
            envObject: {}
        } )

        expect( activationPayloads ).toBeDefined()
        
        activationPayloads
            .forEach( ( payload ) => {
                expect( payload ).toHaveProperty( 'messages' )
                expect( payload ).toHaveProperty( 'schema' )
                expect( payload ).toHaveProperty( 'serverParams' )
                
                expect( Array.isArray( payload.messages ) ).toBe( true )
                expect( typeof payload.schema ).toBe( 'object' )
                expect( typeof payload.serverParams ).toBe( 'object' )
                expect( payload.schema ).toHaveProperty( 'namespace' )
                expect( payload.schema ).toHaveProperty( 'routes' )
            } )
    } )

    it( 'handles empty schema array', () => {
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: [],
                envObject: {},
                activateTags: [],
                includeNamespaces: [],
                excludeNamespaces: []
            } )
        } ).toThrow()
    } )

    it( 'validates environment object contains all required server params', () => {
        const partialEnv = {
            // Missing API_KEY that luksoNetwork requires
        }

        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: [ mockSchemas[ 0 ] ],
                envObject: partialEnv
            } )
        } ).toThrow( 'Activation preparation failed' )
    } )
} )