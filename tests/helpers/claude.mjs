import fs from 'fs'
import path from 'path'
import { FlowMCP } from './../../src/index.mjs'
import { fileURLToPath } from 'url'


function getEnv( { path, selection } ) {
    const result = fs
        .readFileSync( path, 'utf-8' )
        .split( "\n" )
        .map( line => line.split( '=' ) )
        .reduce( ( acc, [ k, v ] ) => {
            const find = selection.find( ( [ key, value ] ) => value === k )
            if( find ) { 
                acc[ find[ 0 ] ] = v 
            }
            return acc
        }, {} )

    return result
}



function getAllFiles({ dirPath, arrayOfFiles = [] }) {
    const files = fs.readdirSync( dirPath )

    files
        .forEach( ( file ) => {
            const fullPath = path.join( dirPath, file )
            if( fs.statSync( fullPath ).isDirectory() ) {
                getAllFiles( { dirPath: fullPath, arrayOfFiles } )
            } else {
                arrayOfFiles.push( fullPath )
            }
        } )

  return arrayOfFiles
}


async function getSchemas( { dirPath } ) {
    const __filename = fileURLToPath( import.meta.url )
    const __dirname = path.dirname( __filename )
    dirPath = path.resolve( __dirname, dirPath )
    

    const schemaPaths = getAllFiles( { dirPath } )
        .filter( ( file ) => !file.endsWith( '.DS_Store' ) )
        .map( ( file ) => ( {
            folderName: path.basename( path.dirname( file ) ),
            path: path.resolve( file )
        } ) )

    const schemas = await schemaPaths
        .reduce( ( promise, { path: p } ) => promise.then( async( schemas ) => {
            const { schema } = await import( p )
            return [ ...schemas, schema ]
        } ), Promise.resolve( [] ) )

    const schemaErrors = schemas
        .reduce( ( acc, schema ) => {
            const result = FlowMCP.validateSchema( { schema } )
            acc.push( ...result['messages'] )
            return acc
        }, [] )

    return { schemas, schemaErrors }
}


function getAllServerParams( { schemas, isClaude, claudeEnv, localEnvPath } ) {
    const serverParamsErrors = []
    const allServerParams = Array.from( 
        new Set( 
            schemas
                .reduce( ( acc, schema ) => {
                    acc.add( ...schema['requiredServerParams'] )
                    return acc
                }, new Set() )
        )
    )
        .filter( a => a !== undefined )

    let params = {}
    if( isClaude ) {
        params = allServerParams
            .reduce( ( acc, key ) => {
                acc[ key ] = claudeEnv[ key ]
                return acc
            }, {} )
    } else {
        const selection = allServerParams
            .map( ( key ) => [ key, key ] )
        params = getEnv( { path: localEnvPath, selection } )
    }

    const paramErrors = []
    Object.entries( params )
        .forEach( ( [ key, value ] ) => {
            if( !value ) {
                paramErrors.push( `Missing ${key} in .env file` )
            }
        } )

    return { params, paramErrors }
}



export { getAllFiles, getSchemas, getAllServerParams }