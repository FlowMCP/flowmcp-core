import fs from 'fs';
import path from 'path';


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


function getSchemas( { dirPath } ) {
    const result = getAllFiles( { dirPath } )
        .filter( ( file ) => !file.endsWith( '.DS_Store' ) )
        .map( ( file ) => ( {
            folderName: path.basename( path.dirname( file ) ),
            path: path.resolve( file )
        } ) )

    return result;
}


function getEnv( { path, selection } ) {
/*
    const selection = [
        [ 'privateKey', 'SOLANA_PRIVATE_KEY'     ],
        [ 'publicKey',  'SOLANA_PUBLIC_KEY'      ],
        [ 'apiKey',     'SOLANA_TRACKER_API_KEY' ],
        [ 'nodeUrl',    'SOLANA_MAINNET_HTTPS'   ]
    ]
*/
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

    selection
        .forEach( ( row ) => {
            const [ key, _ ] = row
            if( !result[ key ]  ) { console.log( `Missing ${key} in .env file` ) } 
            return true
        } )

    return result
}


async function getAllServerParams( { schemas, envPath } ) {
    let requiredParams = new Set()
    for( const _schema of schemas ) {
        const { path } = _schema
        const { schema } = await import( path )
        const { requiredServerParams } = schema
        for( const param of requiredServerParams ) {
            requiredParams.add( param )
        }
    }

    const selection = Array
        .from( requiredParams )
        .map( ( param ) => [ param, param ] )
    const allServerParams = getEnv( {
        'path': envPath,
        selection
    } )

    return { allServerParams }
}



export { getAllFiles, getSchemas, getEnv, getAllServerParams }