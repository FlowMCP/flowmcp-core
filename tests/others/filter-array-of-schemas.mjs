import { SchemaImporter } from 'schemaimporter'
import { FlowMCP } from '../../src/index.mjs'

const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: false,
        addAdditionalMetaData: true,
        outputType: 'onlySchema'
    } )

console.log( 'arrayOfSchemas:', arrayOfSchemas.length )

const { filteredArrayOfSchemas } = FlowMCP
    .filterArrayOfSchemas( {
        arrayOfSchemas,
        includeNamespaces: ['luksoNetwork'],
        excludeNamespaces: [], // ['luksoNetwork'],
        activateTags: [] // [  'luksoNetwork.!getBlocks', 'luksoNetwork.!getBlockTransactions' ],
    } )

console.log( 'filteredArrayOfSchemas:', filteredArrayOfSchemas.length )