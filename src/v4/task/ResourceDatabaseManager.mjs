/**
 * FlowMCP — MIT License
 *
 * DISCLAIMER: This code orchestrates calls to third-party APIs. Each API has
 * its own Terms of Services. FlowMCP makes no representation about TOS
 * compliance, data licensing, or fitness for any purpose. Users are solely
 * responsible for reviewing and adhering to each API provider's terms.
 *
 * For more information, see LICENSE.md and DISCLAIMER.md in the repo root.
 */

import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'


class ResourceDatabaseManager {
    static #connections = new Map()
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

        const entries = Object.entries( resources === undefined || resources === null ? {} : resources )

        const allowedSources = [ 'sqlite', 'markdown', 'http' ]

        entries
            .forEach( ( [ resourceName, resourceDef ] ) => {
                const { source } = resourceDef

                if( !allowedSources.includes( source ) ) {
                    messages.push( `RES001: Resource "${resourceName}": source must be one of 'sqlite', 'markdown', or 'http', got "${source}"` )

                    return
                }

                if( source === 'http' ) {
                    ResourceDatabaseManager.#handleHttpSource( {
                        resourceName,
                        resourceDef,
                        schemaRef,
                        messages
                    } )

                    return
                }

                if( source === 'markdown' ) {
                    // Markdown resources are file-based and validated at this layer.
                    // Full markdown loading (parameter-based access, sections, search)
                    // is handled by downstream resource resolvers, not by this manager.
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

                const mode = resourceDef['mode'] === undefined ? 'in-memory' : resourceDef['mode']
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
        const entry = ResourceDatabaseManager.#connections.get( key )
        const safeEntry = entry === undefined ? null : entry
        const db = safeEntry === null ? null : safeEntry['db']
        const mode = safeEntry === null ? null : safeEntry['mode']
        const sourceUrl = safeEntry === null || safeEntry['sourceUrl'] === undefined
            ? null
            : safeEntry['sourceUrl']

        return { db, mode, sourceUrl }
    }


    static openTransient( { database, origin, name, schemaDir, mode } ) {
        const resolvedMode = mode === undefined ? 'in-memory' : mode
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
    }


    static getConnectionCount() {
        const count = ResourceDatabaseManager.#connections.size

        return { count }
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
                const resolvedPath = join( schemaDir === undefined ? '.' : schemaDir, 'resources', name )

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
            const fallback = name === undefined ? '' : name

            return { resolvedPath: fallback, warning }
        }

        const resolvedPath = resolver()

        return { resolvedPath }
    }


    static #handleHttpSource( { resourceName, resourceDef, schemaRef, messages } ) {
        const { path, url } = resourceDef

        if( path === undefined || typeof path !== 'string' || path.length === 0 ) {
            messages.push(
                `RES036: Resource "${resourceName}": source='http' requires 'path' (local file)`
            )

            return
        }

        if( !existsSync( path ) ) {
            messages.push(
                `RES036: Resource "${resourceName}": source='http' requires an existing ` +
                `local file at path '${path}' (Core does not download — CLI must provide the file)`
            )

            return
        }

        const key = `${schemaRef}::${resourceName}`

        if( ResourceDatabaseManager.#connections.has( key ) ) {
            return
        }

        const { db, error } = ResourceDatabaseManager.#connect( {
            databasePath: path,
            mode: 'readonly'
        } )

        if( error ) {
            messages.push( `Resource "${resourceName}": ${error}` )

            return
        }

        const sourceUrl = url === undefined ? null : url

        ResourceDatabaseManager.#connections.set( key, {
            db,
            mode: 'readonly',
            databasePath: path,
            sourceUrl
        } )
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
