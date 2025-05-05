import path from 'path'
import fs from 'fs'
import { FlowMCP } from './../index.mjs'


class Server {
    static config = {}
    static schemas = []
    static params = {}


    static getArgvParameters({
        argv,
        claudeArgv = '--launched-by=claude',
        includeNamespaces = [],
        excludeNamespaces = [],
        activateTags = []
      }) {
        const isDevelopment = !argv.includes( claudeArgv )
        const args = process.argv.slice( 2 )
      
        const result = {
            isDevelopment,
            includeNamespaces,
            excludeNamespaces,
            activateTags
        };
      
        const [start] = claudeArgv.split('=')
        const argMappings = {
            [ start ]: 'claudeArgv',
            '--includeNamespaces=': 'includeNamespaces',
            '--excludeNamespaces=': 'excludeNamespaces',
            '--activateTags=': 'activateTags'
        }
      
        args
            .forEach((arg) => {
                Object
                    .entries( argMappings )
                    .forEach( ( [ prefix, key ] ) => {
                        if( arg.startsWith( prefix ) ) {
                        const value = arg.substring( prefix.length )
                        if( key === 'claudeArgv' ) {
                            result[ key ] = arg
                        } else if( value.trim() ) {
                            result[ key ] = value.split( ',' ).filter( Boolean )
                        }
                    }
                } )
            } )
        Server.config = result

        return this
    }


    static async prepare( {
        scriptRootFolder,
        schemasRootFolder,
        localEnvPath
    } = {} ) {
        const {
            isDevelopment,
            includeNamespaces = [],
            excludeNamespaces = [],
            activateTags = []
        } = Server.config

        const dirPath = path.resolve( scriptRootFolder, schemasRootFolder )
        let { schemas, schemaErrors } = await Server.#getSchemas( { dirPath } )
      
        if( schemaErrors.length > 0 ) {
            console.warn( 'Schema Errors:', schemaErrors )
            throw new Error( 'Schema Errors' )
        }
      
        localEnvPath = path.resolve( scriptRootFolder, localEnvPath )
        const { params, paramErrors } = Server
            .#getAllServerParams( { schemas, isDevelopment, localEnvPath } )
      
        if( paramErrors.length > 0 ) {
            console.warn( 'Server Params Errors:', paramErrors )
            throw new Error( 'Server Params Errors' )
        }
      
        const include = includeNamespaces.map( ns => ns.toLowerCase() )
        const exclude = excludeNamespaces.map( ns => ns.toLowerCase() )
      
        const filtered = schemas
            .filter( ( { namespace } ) => {
                const ns = namespace.toLowerCase();
                if( !include.length && !exclude.length ) { return true }
                if( exclude.some( ex => ns.includes( ex ) ) ) { return false }
                return !include.length || include.some( inc => ns.includes( inc ) )
            } )
      
        const prepared = filtered
            .map( ( schema ) => {
                const serverParams = schema
                    .requiredServerParams
                    .reduce( ( acc, key ) => { acc[ key ] = params[ key ]; return acc }, {} )
                return { serverParams, schema, activateTags }
            } )
        return prepared
    } 


    static async #getSchemas( { dirPath } ) {
        const schemaPaths = Server.#getAllFiles( { dirPath } )
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


    static #getAllFiles({ dirPath, arrayOfFiles = [] }) {
        const files = fs.readdirSync( dirPath )
    
        files
            .forEach( ( file ) => {
                const fullPath = path.join( dirPath, file )
                if( fs.statSync( fullPath ).isDirectory() ) {
                    Server.#getAllFiles( { dirPath: fullPath, arrayOfFiles } )
                } else {
                    arrayOfFiles.push( fullPath )
                }
            } )
    
      return arrayOfFiles
    }


    static #getAllServerParams( { schemas, isDevelopment, localEnvPath } ) {
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
        if( !isDevelopment ) {
            const claudeEnv = process.env
            params = allServerParams
                .reduce( ( acc, key ) => {
                    acc[ key ] = claudeEnv[ key ]
                    return acc
                }, {} )
        } else {
            const selection = allServerParams
                .map( ( key ) => [ key, key ] )
            params = Server.#getEnv( { path: localEnvPath, selection } )
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


    static #getEnv( { path, selection } ) {
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
}


export { Server }