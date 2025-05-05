import fs from 'fs'


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


function getServerParams( { schema, path } ) {
    const { requiredServerParams } = schema
    const { serverParams } = requiredServerParams
        .reduce( ( acc, key, index, arr ) => {
            if( process.env[ key ] !== undefined ) {
                acc['serverParams'][ key ] = process.env[ key ]
                return acc
            }
            acc['selection'].push( [ key, key ] )

            if( index === arr.length - 1 ) {
                const env = getEnv( { 
                    path,
                    'selection': acc['selection']
                } )
                acc['serverParams'] = { ...acc['serverParams'], ...env }
            }
            return acc
        }, { 'serverParams': {}, 'selection': [] } )

    return { serverParams }
}


export { getEnv, getServerParams }