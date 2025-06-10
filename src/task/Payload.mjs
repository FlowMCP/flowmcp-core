class Payload {
    static prepareActivations( { 
        arrayOfSchemas, 
        envObject
    } ) {
/*
        const schemasImports = await listOfSchemaPaths
            .reduce(
                ( accPromise, fullPath, index ) => accPromise.then( async ( acc ) => {
                    const result = { 'fileName': '', 'path': '', 'schema': null, 'messages': [] }

                    try {
                        result['fileName'] = path.basename( fullPath )
                        const { schema } = await import( fullPath )
                        result['path'] = fullPath
                        result['schema'] = schema
                        if ( !schema ) {
                            result['messages'].push( `Schema not found in ${result['fileName']}` )
                        }
                    } catch ( err ) {
                        console.log( `Error importing schema from ${fullPath}:`, err )
                        result['messages'].push( `Error importing schema from ${fullPath}: ${err.message}` )
                    }

                    return [ ...acc, result ]
                }),
                Promise.resolve( [] )
            )
*/
        const activationPayloads = arrayOfSchemas
            .map( ( schema ) => {
                const result = { 'fileName': '', 'path': '', schema, 'messages': [] }
                return result
            } )
            // .map( ( item ) => { item['activateTags'] = activateTags; return item } ) 
            .map( ( item ) => {
                item['serverParams'] = null
                if( item['messages'].length > 0 ) { return item } 
                const { schema: { requiredServerParams } } = item
                const selection = requiredServerParams
                    .map( ( param ) => [ param, param ] )
                const { messages, result: serverParams } = Payload
                    .#parseEnvFileContent( { envObject, selection } )
                item['messages'] = [ ...item['messages'], ...messages ]
                item['serverParams'] = serverParams

                return item
            } )
            .map( ( { schema, serverParams, messages } ) => {
                return { schema, serverParams, messages }
            } )

        const messages = activationPayloads
            .reduce( ( acc, item, index ) => {
                const { fileName, messages } = item
                const prefix = `${fileName} [${index}]`
                messages
                    .forEach( ( message ) => acc.push( `${prefix}: ${message}` ) )
                return acc
            }, [] )
        const status = messages.length === 0
        
        return { status, messages, activationPayloads }
    }


    static #parseEnvFileContent( { envObject, selection } ) {
        const messages = []
    /*
        const selection = [
            [ 'privateKey', 'SOLANA_PRIVATE_KEY'     ],
            [ 'publicKey',  'SOLANA_PUBLIC_KEY'      ],
            [ 'apiKey',     'SOLANA_TRACKER_API_KEY' ],
            [ 'nodeUrl',    'SOLANA_MAINNET_HTTPS'   ]
        ]
    */
        const result = Object
            .entries( envObject )
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
                if( !result[ key ]  ) { messages.push( `Missing ${key} in .env file` ) } 
                return true
            } )

        return { messages, result }
    }
}


export { Payload }