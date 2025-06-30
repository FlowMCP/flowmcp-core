import { SchemaImporter } from 'schemaimporter'

import { FlowMCP } from '../../src/index.mjs'


describe( 'SchemaImporter & FlowMCP: Filtering by Namespace', () => {
    let arrayOfSchemas
    let filteredArrayOfSchemas


    beforeAll( async () => {
        arrayOfSchemas = await SchemaImporter.loadFromFolder( {
            excludeSchemasWithImports: true,
            excludeSchemasWithRequiredServerParams: true,
            addAdditionalMetaData: true,
            outputType: 'onlySchema'
        } )

        const result = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas,
            includeNamespaces: [ 'luksoNetwork' ],
            excludeNamespaces: [],
            activateTags: []
        } )

        filteredArrayOfSchemas = result.filteredArrayOfSchemas
    } )


    it( 'loads a non-empty array of schemas', () => {
        expect( Array.isArray( arrayOfSchemas ) ).toBe( true )
        expect( arrayOfSchemas.length ).toBeGreaterThan( 0 )
    } )


    it( 'filters schemas by namespace "luksoNetwork"', () => {
        expect( Array.isArray( filteredArrayOfSchemas ) ).toBe( true )
        expect( filteredArrayOfSchemas.length ).toBeGreaterThan( 0 )


        filteredArrayOfSchemas
            .forEach( ( schema ) => {
                expect( schema.namespace ).toBe( 'luksoNetwork' )
            } )
    } )
} )
