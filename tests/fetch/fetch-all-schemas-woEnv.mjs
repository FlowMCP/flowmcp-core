import { FlowMCP } from '../../src/index.mjs'
import { SchemaImporter } from 'schemaimporter'
import { Print } from './helpers/Print.mjs'


const schemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: true,
        addAdditionalMetaData: true,
        outputType: null
    } )

await schemas
    .reduce( ( promise, struct ) => promise.then( async () => {
        const { schema, namespace, fileName } = struct
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
    } ), Promise.resolve() )

