import { ResourceDatabaseManager } from './ResourceDatabaseManager.mjs'
import { ResourceMarkdownLoader } from './ResourceMarkdownLoader.mjs'


class ResourceExecutor {
    static #FREEQUERY_DEFINITION = {
        sql: '{{DYNAMIC_SQL}}',
        description: 'Execute a custom SQL query against the database',
        parameters: [
            {
                position: { key: 'sql', value: '{{USER_PARAM}}' },
                z: { primitive: 'string()', options: [ 'min(1)' ] }
            },
            {
                position: { key: 'limit', value: '{{USER_PARAM}}' },
                z: { primitive: 'number()', options: [] }
            }
        ],
        output: {
            mimeType: 'application/json',
            schema: { type: 'array', items: { type: 'object' } }
        }
    }


    static async execute( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } ) {
        const source = resourceDefinition['source'] || 'sqlite'

        if( source === 'markdown' ) {
            const { struct } = ResourceExecutor.#executeMarkdown( {
                resourceDefinition,
                userParams: userParams || {}
            } )

            return { struct }
        }

        const { struct } = await ResourceExecutor.#executeSqlite( {
            resourceDefinition,
            resourceName,
            queryName,
            userParams,
            handlerMap,
            schemaRef
        } )

        return { struct }
    }


    static #executeMarkdown( { resourceDefinition, userParams } ) {
        const struct = {
            status: true,
            messages: [],
            data: null
        }

        const { resolvedPath } = ResourceExecutor.#resolveMarkdownPath( { resourceDefinition } )

        let content = null

        try {
            const loaded = ResourceMarkdownLoader.load( { filePath: resolvedPath } )
            content = loaded['content']
        } catch( readError ) {
            struct['status'] = false
            struct['messages'].push( `Failed to read markdown file "${resolvedPath}": ${readError.message}` )

            return { struct }
        }

        const { section, lines, search } = userParams

        if( section ) {
            const { result } = ResourceMarkdownLoader.getSection( { content, section } )

            if( result === null ) {
                struct['status'] = false
                struct['messages'].push( `Section "${section}" not found in document` )

                return { struct }
            }

            struct['data'] = result

            return { struct }
        }

        if( lines ) {
            const { from, to, error } = ResourceMarkdownLoader.parseLineRange( { lines } )

            if( error ) {
                struct['status'] = false
                struct['messages'].push( error )

                return { struct }
            }

            const { result } = ResourceMarkdownLoader.getLines( { content, from, to } )
            struct['data'] = result

            return { struct }
        }

        if( search ) {
            const { results } = ResourceMarkdownLoader.searchContent( { content, search } )
            struct['data'] = results

            return { struct }
        }

        struct['data'] = content

        return { struct }
    }


    static #resolveMarkdownPath( { resourceDefinition } ) {
        const { origin, name, schemaDir } = resourceDefinition
        const { resolvedPath } = ResourceDatabaseManager.resolvePath( { origin, name, schemaDir } )

        return { resolvedPath }
    }


    static async #executeSqlite( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } ) {
        const struct = {
            status: true,
            messages: [],
            data: null
        }

        const mode = resourceDefinition['mode'] || 'in-memory'
        const { queries } = resourceDefinition

        const isFreeQuery = queryName === 'freeQuery' && !queries['freeQuery']
        const queryDef = isFreeQuery
            ? ResourceExecutor.#FREEQUERY_DEFINITION
            : queries[ queryName ]

        if( !queryDef ) {
            struct['status'] = false
            struct['messages'].push( `Query "${queryName}" not found in resource` )

            return { struct }
        }

        let db = null
        let isTransient = false
        let connectionMode = mode
        let databasePath = null

        if( schemaRef && resourceName ) {
            const result = ResourceDatabaseManager.getConnection( { schemaRef, resourceName } )
            db = result['db']
            connectionMode = result['mode'] || mode
        }

        if( !db ) {
            const result = ResourceDatabaseManager.openTransient( {
                database: resourceDefinition['database'],
                origin: resourceDefinition['origin'],
                name: resourceDefinition['name'],
                schemaDir: resourceDefinition['schemaDir'],
                mode
            } )

            db = result['db']
            isTransient = true
            databasePath = result['databasePath']

            if( result['error'] ) {
                struct['status'] = false
                struct['messages'].push( result['error'] )

                return { struct }
            }
        }

        try {
            const { sql, parameters } = queryDef
            const isDynamicSql = sql === '{{DYNAMIC_SQL}}'

            if( isDynamicSql ) {
                const { struct: dynamicResult } = ResourceExecutor.#executeDynamicSql( {
                    db,
                    userParams,
                    struct,
                    mode: connectionMode,
                    databasePath
                } )

                if( !dynamicResult['status'] ) {
                    return { struct: dynamicResult }
                }

                struct['data'] = dynamicResult['data']
            } else {
                const paramValues = ( parameters || [] )
                    .map( ( param ) => {
                        const { position } = param
                        const { key } = position
                        const value = userParams[ key ]

                        return value
                    } )

                const stmt = db.prepare( sql )
                const results = paramValues.length > 0
                    ? stmt.all( ...paramValues )
                    : stmt.all()

                struct['data'] = results
            }
        } catch( sqlError ) {
            struct['status'] = false
            struct['messages'].push( `SQL error: ${sqlError.message}` )

            return { struct }
        } finally {
            if( isTransient ) {
                ResourceDatabaseManager.closeTransient( { db } )
            }
        }

        const handler = handlerMap
        const effectiveHandler = handler || {}
        const resourceHandler = effectiveHandler[ queryName ] || {}

        if( resourceHandler['postRequest'] ) {
            try {
                const result = await resourceHandler['postRequest']( {
                    response: struct['data'],
                    struct: { queryName, sql: queryDef['sql'] },
                    payload: { ...userParams }
                } )

                if( result['response'] !== undefined ) {
                    struct['data'] = result['response']
                }
            } catch( handlerError ) {
                struct['status'] = false
                struct['messages'].push( `postRequest error: ${handlerError.message}` )

                return { struct }
            }
        }

        return { struct }
    }


    static injectFreeQuery( { queries, mode } ) {
        if( queries['freeQuery'] ) {
            return { queries }
        }

        const description = mode === 'file-based'
            ? 'Execute any SQL statement against the database'
            : 'Execute a SELECT query against the database (read-only)'

        const injected = {
            ...queries,
            freeQuery: {
                ...ResourceExecutor.#FREEQUERY_DEFINITION,
                description
            }
        }

        return { queries: injected }
    }


    static #executeDynamicSql( { db, userParams, struct, mode, databasePath } ) {
        const userSql = userParams['sql']

        if( !userSql || typeof userSql !== 'string' ) {
            struct['status'] = false
            struct['messages'].push( 'Dynamic SQL: "sql" parameter is required and must be a string' )

            return { struct }
        }

        const trimmed = userSql.trim()

        if( mode === 'in-memory' ) {
            if( !trimmed.toUpperCase().startsWith( 'SELECT' ) && !trimmed.toUpperCase().startsWith( 'WITH' ) ) {
                struct['status'] = false
                struct['messages'].push( 'Dynamic SQL: Only SELECT statements are allowed in in-memory mode' )

                return { struct }
            }
        }

        if( mode === 'file-based' && databasePath ) {
            const isWrite = ResourceExecutor.#isWriteStatement( { sql: trimmed } )

            if( isWrite ) {
                ResourceDatabaseManager.createBackupIfNeeded( { databasePath } )
            }
        }

        const isSelect = trimmed.toUpperCase().startsWith( 'SELECT' ) || trimmed.toUpperCase().startsWith( 'WITH' )

        if( isSelect ) {
            const limit = Math.min( userParams['limit'] || 100, 1000 )
            const hasLimit = /\bLIMIT\b/i.test( trimmed )
            const finalSql = hasLimit ? trimmed : `${trimmed} LIMIT ${limit}`

            const stmt = db.prepare( finalSql )
            const results = stmt.all()

            struct['data'] = results
        } else {
            const stmt = db.prepare( trimmed )
            const info = stmt.run()

            struct['data'] = {
                changes: info['changes'],
                lastInsertRowid: info['lastInsertRowid']
            }
        }

        return { struct }
    }


    static #isWriteStatement( { sql } ) {
        const upper = sql.toUpperCase()
        const writeKeywords = [ 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'REPLACE', 'TRUNCATE' ]

        const found = writeKeywords
            .find( ( keyword ) => {
                const match = upper.startsWith( keyword )

                return match
            } )

        return found !== undefined
    }
}


export { ResourceExecutor }
