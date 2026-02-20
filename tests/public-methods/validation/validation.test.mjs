import { FlowMCP } from '../../../src/v1/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.validation: Validation Coverage Tests', () => {


    it( 'handles missing arrayOfSchemas in prepareActivations', () => {
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: null,
                envObject: { test: 'value' }
            } )
        } ).toThrow( 'Missing or invalid arrayOfSchemas' )
    } )


    it( 'handles invalid arrayOfSchemas type in prepareActivations', () => {
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: [ 'invalid', 'string' ],
                envObject: { test: 'value' }
            } )
        } ).toThrow( 'arrayOfSchemas must be an array of objects' )
    } )


    it( 'handles missing envObject in prepareActivations', () => {
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: [ mockSchemas[ 0 ] ],
                envObject: null
            } )
        } ).toThrow( 'Missing or invalid envObject' )
    } )


    it( 'handles deprecated parameters in prepareActivations', () => {
        expect( () => {
            FlowMCP.prepareActivations( {
                arrayOfSchemas: [ mockSchemas[ 0 ] ],
                envObject: { test: 'value' },
                includeNamespaces: [ 'test' ]
            } )
        } ).toThrow( 'includeNamespaces: Is deprecated use filterArrayOfSchema instead.' )
    } )


    it( 'handles invalid arrayOfSchemas in filterArrayOfSchemas', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: null,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'Missing or invalid arrayOfSchemas' )
    } )


    it( 'handles empty arrayOfSchemas in filterArrayOfSchemas', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [],
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'Missing or invalid arrayOfSchemas' )
    } )


    it( 'handles non-array parameters in filterArrayOfSchemas', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [ mockSchemas[ 0 ] ],
                includeNamespaces: 'not-array',
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'includeNamespaces: Must be an array' )
    } )


    it( 'handles non-string array elements in filterArrayOfSchemas', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [ mockSchemas[ 0 ] ],
                includeNamespaces: [ 123, 'valid' ],
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'includeNamespaces: Must be an array of non-empty strings' )
    } )


    it( 'handles schema validation with non-strict mode', () => {
        const result = FlowMCP.validateSchema( { schema: null } )
        
        expect( result.status ).toBe( false )
        expect( result.messages ).toContain( 'schema: Missing schema' )
    } )


    it( 'handles schema validation with invalid schema type in non-strict mode', () => {
        const result = FlowMCP.validateSchema( { schema: 'not-object' } )

        expect( result.status ).toBe( false )
        expect( result.messages ).toContain( 'schema: schema must be an object' )
    } )


    it( 'handles schema with empty namespace in non-strict mode', () => {
        const schemaWithEmptyNamespace = {
            ...mockSchemas[ 0 ],
            namespace: ''
        }

        const result = FlowMCP.validateSchema( { schema: schemaWithEmptyNamespace } )
        
        expect( result.status ).toBe( false )
        expect( result.messages.some( m => m.includes( 'Namespace is empty' ) ) ).toBe( true )
    } )


    it( 'handles schema with valid structure in non-strict mode', () => {
        const result = FlowMCP.validateSchema( { schema: mockSchemas[ 0 ] } )

        expect( result.status ).toBe( true )
        expect( result.messages.length ).toBe( 0 )
    } )


    it( 'validates routes through fetch method', async () => {
        await expect( async () => {
            await FlowMCP.fetch( {
                schema: mockSchemas[ 0 ],
                userParams: { limit: 10 },
                serverParams: { API_KEY: 'test' },
                routeName: 'nonexistentRoute'
            } )
        } ).rejects.toThrow( 'Unknown routeName "nonexistentRoute"' )
    } )


    it( 'validates serverParams through fetch method', async () => {
        await expect( async () => {
            await FlowMCP.fetch( {
                schema: mockSchemas[ 0 ],
                userParams: { limit: 10 },
                serverParams: null,
                routeName: 'getBlocks'
            } )
        } ).rejects.toThrow( 'serverParams: Missing serverParams' )
    } )


    it( 'validates userParams through fetch method', async () => {
        await expect( async () => {
            await FlowMCP.fetch( {
                schema: mockSchemas[ 0 ],
                userParams: null,
                serverParams: { API_KEY: 'test' },
                routeName: 'getBlocks'
            } )
        } ).rejects.toThrow( 'userParams: Missing userParams' )
    } )
} )