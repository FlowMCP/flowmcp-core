import Database from 'better-sqlite3'
import { copyFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'


class ResourceDatabaseManager {
    static #connections = new Map()
    static #backupCreated = new Set()
    static #basisFolder = 'flowmcp'


    static setBasisFolder( { basisFolder } ) {
        ResourceDatabaseManager.#basisFolder = basisFolder
    }


    static getBasisFolder() {
        const basisFolder = ResourceDatabaseManager.#basisFolder

        return { basisFolder }
    }


    static async initialize( { resources, schemaRef, schemaDir } ) {
        const messages = []

        const entries = Object.entries( resources || {} )

        entries
            .forEach( ( [ resourceName, resourceDef ] ) => {
                const { source } = resourceDef

                if( source !== 'sqlite' ) {
                    return
                }

                const key = `${schemaRef}::${resourceName}`

                if( ResourceDatabaseManager.#connections.has( key ) ) {
                    return
                }

                const { resolvedPath } = ResourceDatabaseManager.resolvePath( {
                    origin: resourceDef['origin'],
                    name: resourceDef['name'],
                    schemaDir,
                    database: resourceDef['database']
                } )

                const mode = resourceDef['mode'] || 'in-memory'
                const { db, error } = ResourceDatabaseManager.#connect( { databasePath: resolvedPath, mode } )

                if( error ) {
                    messages.push( `Resource "${resourceName}": ${error}` )

                    return
                }

                ResourceDatabaseManager.#connections.set( key, { db, mode, databasePath: resolvedPath } )
            } )

        const status = messages.length === 0

        return { status, messages }
    }


    static getConnection( { schemaRef, resourceName } ) {
        const key = `${schemaRef}::${resourceName}`
        const entry = ResourceDatabaseManager.#connections.get( key ) || null
        const db = entry ? entry['db'] : null
        const mode = entry ? entry['mode'] : null

        return { db, mode }
    }


    static openTransient( { database, origin, name, schemaDir, mode } ) {
        const resolvedMode = mode || 'in-memory'
        const { resolvedPath } = ResourceDatabaseManager.resolvePath( { origin, name, schemaDir, database } )
        const { db, error } = ResourceDatabaseManager.#connect( { databasePath: resolvedPath, mode: resolvedMode } )

        return { db, error, mode: resolvedMode, databasePath: resolvedPath }
    }


    static closeTransient( { db } ) {
        if( db && typeof db.close === 'function' ) {
            db.close()
        }
    }


    static closeAll() {
        ResourceDatabaseManager.#connections
            .forEach( ( entry ) => {
                const { db } = entry

                if( db && typeof db.close === 'function' ) {
                    db.close()
                }
            } )

        ResourceDatabaseManager.#connections.clear()
        ResourceDatabaseManager.#backupCreated.clear()
    }


    static getConnectionCount() {
        const count = ResourceDatabaseManager.#connections.size

        return { count }
    }


    static createBackupIfNeeded( { databasePath } ) {
        if( ResourceDatabaseManager.#backupCreated.has( databasePath ) ) {
            return { created: false }
        }

        if( !existsSync( databasePath ) ) {
            return { created: false }
        }

        const backupPath = `${databasePath}.bak`
        copyFileSync( databasePath, backupPath )
        ResourceDatabaseManager.#backupCreated.add( databasePath )

        return { created: true }
    }


    static resolvePath( { origin, name, schemaDir, database } ) {
        if( database ) {
            if( database.startsWith( '~/' ) ) {
                const resolved = database.replace( '~', homedir() )

                return { resolvedPath: resolved }
            }

            return { resolvedPath: database }
        }

        const basisFolder = ResourceDatabaseManager.#basisFolder

        const resolvers = {
            'inline': () => {
                const resolvedPath = join( schemaDir || '.', 'resources', name )

                return resolvedPath
            },
            'project': () => {
                const resolvedPath = join( process.cwd(), `.${basisFolder}`, 'resources', name )

                return resolvedPath
            },
            'global': () => {
                const resolvedPath = join( homedir(), `.${basisFolder}`, 'resources', name )

                return resolvedPath
            }
        }

        const resolver = resolvers[ origin ]

        if( !resolver ) {
            const warning = origin
                ? `ResourceDatabaseManager: Unknown origin "${origin}" — using name as fallback path`
                : null
            return { resolvedPath: name || '', warning }
        }

        const resolvedPath = resolver()

        return { resolvedPath }
    }


    static #connect( { databasePath, mode } ) {
        try {
            if( mode === 'file-based' ) {
                const db = new Database( databasePath )
                db.pragma( 'journal_mode = WAL' )

                return { db, error: null }
            }

            const db = new Database( databasePath, { readonly: true } )

            return { db, error: null }
        } catch( err ) {
            const error = `Failed to open database "${databasePath}": ${err.message}`

            return { db: null, error }
        }
    }
}


export { ResourceDatabaseManager }
