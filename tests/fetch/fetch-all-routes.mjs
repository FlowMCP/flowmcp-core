import { FlowMCP } from '../../src/index.mjs'
import { SchemaImporter } from 'schemaimporter'
import { Print } from './helpers/Print.mjs'

const schemas = await SchemaImporter
    .get( {
        'onlyWithoutImports': true,
        'withMetaData': true,
        'withSchema': true
    } )
const filteredSchemas = schemas
    .filter( ( { schema } ) => {
        const { requiredServerParams } = schema
        return requiredServerParams.length === 0 
    } )

const { schema, namespace, fileName } = filteredSchemas[ 0 ]
const allTests = FlowMCP.getAllTests( { schema } )

Print.log( `\n📦 ${namespace} → ${fileName}` )
await FlowMCP
    .getAllTests( { schema } )
    .reduce( ( testPromise, test ) => testPromise.then( async () => {
        const { routeName, userParams } = test
        const { status, messages, dataAsString } = await FlowMCP
            .fetch({ schema, userParams, routeName, 'serverParams': [] } )
        Print.row( { status, messages, dataAsString, routeName } )
        await Print.delay( 1000 )
    } ), Promise.resolve() )