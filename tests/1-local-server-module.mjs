import fs from 'fs'
import { SchemaImporter } from 'schemaimporter'

import { FlowMCP } from '../src/index.mjs'
import { LocalServer } from '../src/index.mjs'


function getEnvObject( { source, envPath } ) {
    let envObject

    if( source.includes( 'unknown' ) ) {
        envObject = fs
            .readFileSync( envPath, 'utf-8' )
            .split( '\n' )
            .reduce( ( acc, line ) => {
                const [ key, value ] = line.split( '=' )
                if( key && value ) { acc[ key.trim() ] = value.trim() }
                return acc
            }, {} )
    } else if( source.includes( 'claude' ) ) {
        envObject = process.env
    } else { 
        console.log( 'Unknown source:', source ) 
    }

    return { envObject }
}


const schemaFilePaths = await SchemaImporter
    .get( { 
        'onlyWithoutImports': true,
        'withMetaData': true, 
        'withSchema': true 
    } )
const arrayOfSchemas = schemaFilePaths
    .map( ( { schema } ) => schema )
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

const localServer = new LocalServer( { silent: true } )
localServer
    .addActivationPayloads( { activationPayloads } )
await localServer.start()

