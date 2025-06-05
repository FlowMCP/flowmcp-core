import fs from 'fs'
import { SchemaImporter } from 'schemaimporter'

import { FlowMCP } from '../../src/index.mjs'
import { RemoteServer } from '../../src/index.mjs'


function getEnvObject( { source, envPath } ) {
    let envObject

    if( source === 'unknown' ) {
        envObject = fs
            .readFileSync( envPath, 'utf-8' )
            .split( '\n' )
            .reduce( ( acc, line ) => {
                const [ key, value ] = line.split( '=' )
                if( key && value ) { acc[ key.trim() ] = value.trim() }
                return acc
            }, {} )
    } else if( source === 'claude' ) {
        envObject = process.env
    } else { 
        console.log( 'Unknown source:', source ) 
    }

    return { envObject }
}


const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImport: true,
        excludeSchemasWithRequiredServerParams: false,
        addAdditionalMetaData: true,
        outputType: 'onlySchema'
    } )

const { includeNamespaces, excludeNamespaces, activateTags, source } = FlowMCP
    .getArgvParameters( {
        'argv': process.argv,
        'includeNamespaces': [],
        'excludeNamespaces': [],
        'activateTags': [], 
    } )
const { envObject } = getEnvObject( { 
    source,
    envPath: './../../.env'
} )

const { activationPayloads } = FlowMCP
    .prepareActivations( { 
        arrayOfSchemas, 
        envObject, 
        activateTags,
        includeNamespaces,
        excludeNamespaces
    } )

const remoteServer = new RemoteServer( { silent: true } )
remoteServer
    .addActivationPayloads( { 
        activationPayloads, 
        routePath: '/this', 
        transportProtocols: [ 'sse' ] 
    } )
remoteServer.start()
console.log( 'Remote Server started successfully.' )