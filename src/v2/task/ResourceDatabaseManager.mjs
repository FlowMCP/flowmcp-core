import initSqlJs from 'sql.js'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'


class ResourceDatabaseManager {
    static #connections = new Map()
    static #sqlJsInstance = null


    static async initialize( { resources, schemaRef } ) {
        const messages = []

        const entries = Object.entries( resources || {} )

        const results = await Promise.allSettled(
            entries
                .map( async ( [ resourceName, resourceDef ] ) => {
                    const { source, lifecycle = 'persistent' } = resourceDef

                    if( source !== 'sqlite' ) {
                        messages.push( `Resource "${resourceName}": Unknown source "${source}"` )

                        return
                    }

                    if( lifecycle !== 'persistent' ) {
                        return
                    }

                    const key = `${schemaRef}::${resourceName}`

                    if( ResourceDatabaseManager.#connections.has( key ) ) {
                        return
                    }

                    const databasePath = ResourceDatabaseManager.#resolvePath( { database: resourceDef[ 'database' ] } )
                    const { db, error } = await ResourceDatabaseManager.#connect( { databasePath } )

                    if( error ) {
                        messages.push( `Resource "${resourceName}": ${error}` )

                        return
                    }

                    ResourceDatabaseManager.#connections.set( key, db )
                } )
        )

        results
            .forEach( ( result, index ) => {
                if( result.status === 'rejected' ) {
                    const resourceName = entries[ index ][ 0 ]
                    messages.push( `Resource "${resourceName}": ${result.reason.message}` )
                }
            } )

        const status = messages.length === 0

        return { status, messages }
    }


    static getConnection( { schemaRef, resourceName } ) {
        const key = `${schemaRef}::${resourceName}`
        const db = ResourceDatabaseManager.#connections.get( key ) || null

        return { db }
    }


    static async openTransient( { database } ) {
        const databasePath = ResourceDatabaseManager.#resolvePath( { database } )
        const { db, error } = await ResourceDatabaseManager.#connect( { databasePath } )

        return { db, error }
    }


    static closeTransient( { db } ) {
        if( db && typeof db.close === 'function' ) {
            db.close()
        }
    }


    static closeAll() {
        ResourceDatabaseManager.#connections
            .forEach( ( db ) => {
                if( db && typeof db.close === 'function' ) {
                    db.close()
                }
            } )

        ResourceDatabaseManager.#connections.clear()
        ResourceDatabaseManager.#sqlJsInstance = null
    }


    static getConnectionCount() {
        const count = ResourceDatabaseManager.#connections.size

        return { count }
    }


    static #resolvePath( { database } ) {
        if( database.startsWith( '~/' ) ) {
            const resolved = database.replace( '~', homedir() )

            return resolved
        }

        return database
    }


    static async #connect( { databasePath } ) {
        try {
            if( !ResourceDatabaseManager.#sqlJsInstance ) {
                ResourceDatabaseManager.#sqlJsInstance = await initSqlJs()
            }

            const SQL = ResourceDatabaseManager.#sqlJsInstance
            const buffer = readFileSync( databasePath )
            const db = new SQL.Database( buffer )

            return { db, error: null }
        } catch( err ) {
            const error = `Failed to open database "${databasePath}": ${err.message}`

            return { db: null, error }
        }
    }
}


export { ResourceDatabaseManager }
