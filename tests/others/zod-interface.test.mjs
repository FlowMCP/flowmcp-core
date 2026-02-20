import { SchemaImporter } from 'schemaimporter'

import { FlowMCP } from '../../src/v1/index.mjs'


describe( 'MCP schema validation and Zod interface extraction', () => {
    let schemas = []


    beforeAll( async () => {
        schemas = await SchemaImporter.loadFromFolder( {
            excludeSchemasWithImports: true,
            excludeSchemasWithRequiredServerParams: false,
            addAdditionalMetaData: true,
            outputType: null
        } )

        expect( Array.isArray( schemas ) ).toBe( true )
        expect( schemas.length ).toBeGreaterThan( 0 )
    } )


    it( 'contains valid schemas', () => {
        schemas
            .forEach( ( { schema, namespace }, index ) => {
                const { status, messages } = FlowMCP.validateSchema( { schema } )

                if( !status ) {
                    console.warn( `⚠️ Schema ${namespace} is invalid:\n - ${messages.join( '\n - ' )}` )
                }

                expect( status ).toBe( true )
            } )
    } )


    it( 'extracts interfaces from all schemas', () => {
        schemas
            .forEach( ( { schema, namespace, fileName } ) => {
                const interfaces = FlowMCP.getZodInterfaces( { schema } )

                expect( interfaces ).toBeDefined()
                expect( typeof interfaces ).toBe( 'object' )
                expect( Object.keys( interfaces ).length ).toBeGreaterThan( 0 )


                Object
                    .entries( interfaces )
                    .forEach( ( [ key, { toolName, zod } ] ) => {
                        expect( typeof key ).toBe( 'string' )
                        expect( typeof toolName ).toBe( 'string' )
                        expect( zod ).toBeDefined()
                    } )
            } )
    } )
} )
