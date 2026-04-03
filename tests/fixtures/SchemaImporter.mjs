import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'


class SchemaImporter {
    static async loadFromFolder( {
        schemaRootFolder = null,
        excludeSchemasWithImports = true,
        excludeSchemasWithRequiredServerParams = false,
        addAdditionalMetaData = false,
        outputType = null
    } = {} ) {
        const __filename = fileURLToPath( import.meta.url )
        const __dirname = path.dirname( __filename )
        const schemasDir = schemaRootFolder || path.resolve( __dirname, 'schemas' )

        const providerFolders = fs.readdirSync( schemasDir )
            .map( ( name ) => path.join( schemasDir, name ) )
            .filter( ( fullPath ) => fs.statSync( fullPath ).isDirectory() )

        let schemas = []

        for( const folder of providerFolders ) {
            const files = fs.readdirSync( folder )
                .filter( ( f ) => f.endsWith( '.mjs' ) )

            for( const file of files ) {
                const absolutePath = path.resolve( folder, file )
                schemas.push( {
                    folderName: path.basename( folder ),
                    absolutePath,
                    hasImport: false
                } )
            }
        }

        if( outputType === 'onlyPath' ) { return schemas }

        schemas = await Promise.all(
            schemas.map( async ( item ) => {
                const module = await import( item.absolutePath )
                const raw = module.schema || module.main
                item['schema'] = SchemaImporter.#normalizeSchema( raw )
                return item
            } )
        )

        if( excludeSchemasWithRequiredServerParams ) {
            schemas = schemas.filter( ( item ) => {
                const params = item.schema?.requiredServerParams
                return Array.isArray( params ) && params.length === 0
            } )
        }

        if( addAdditionalMetaData ) {
            schemas = schemas
                .filter( ( item ) => item.schema !== undefined && item.schema !== null )
                .map( ( item ) => {
                    const { schema, absolutePath } = item
                    const { namespace, tools, routes, tags, requiredServerParams, resources } = schema
                    const toolEntries = tools || routes || {}
                    const resourceEntries = resources || {}
                    const resourceQueryNames = Object.values( resourceEntries )
                        .reduce( ( acc, r ) => {
                            const queryNames = Object.keys( r['queries'] || {} )
                            return acc.concat( queryNames )
                        }, [] )

                    item = { ...item, namespace, tags, requiredServerParams }
                    item['routeNames'] = Object.keys( toolEntries )
                    item['resourceQueryNames'] = resourceQueryNames
                    item['schemaFolder'] = path.basename( path.dirname( absolutePath ) )
                    item['schemaName'] = path.basename( absolutePath, '.mjs' )
                    item['fileName'] = path.basename( absolutePath )

                    return item
                } )
        }

        if( outputType === 'onlySchema' ) {
            schemas = schemas.map( ( item ) => item['schema'] )
        }

        return schemas
    }
    static #reorderOptions( param ) {
        if( !param?.z?.options || !Array.isArray( param.z.options ) ) { return param }
        const deferred = [ 'optional(', 'default(' ]
        const front = param.z.options.filter( ( o ) => !deferred.some( ( d ) => o.startsWith( d ) ) )
        const back = param.z.options.filter( ( o ) => deferred.some( ( d ) => o.startsWith( d ) ) )
        return { ...param, z: { ...param.z, options: [ ...front, ...back ] } }
    }


    static #normalizeSchema( schema ) {
        if( !schema ) { return schema }

        if( !schema.flowMCP ) {
            schema.flowMCP = '1.2.0'
        }
        if( schema.version ) {
            delete schema.version
        }

        if( !schema.requiredServerParams ) {
            schema.requiredServerParams = []
        }
        if( !schema.headers ) {
            schema.headers = {}
        }

        if( schema.tools && !schema.routes ) {
            const routes = {}
            Object.entries( schema.tools ).forEach( ( [ name, tool ] ) => {
                routes[ name ] = {
                    requestMethod: ( tool.method || 'GET' ).toUpperCase(),
                    route: tool.path || '',
                    description: tool.description || '',
                    parameters: ( tool.parameters || [] ).map( ( p ) => {
                        const reordered = SchemaImporter.#reorderOptions( p )
                        return reordered
                    } ),
                    tests: ( tool.tests || [] ),
                    modifiers: []
                }
            } )
            schema.routes = routes
            delete schema.tools
        }

        if( !schema.handlers ) {
            schema.handlers = {}
        }

        return schema
    }
}


export { SchemaImporter }
