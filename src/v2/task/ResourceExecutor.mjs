import { ResourceDatabaseManager } from './ResourceDatabaseManager.mjs'


class ResourceExecutor {
    static #BLOCKED_PATTERNS = [
        'ATTACH DATABASE', 'LOAD_EXTENSION', 'PRAGMA',
        'CREATE', 'ALTER', 'DROP',
        'INSERT', 'UPDATE', 'DELETE',
        'REPLACE', 'TRUNCATE'
    ]


    static async execute( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } ) {
        const struct = {
            status: true,
            messages: [],
            data: null
        }

        const { queries, lifecycle = 'persistent' } = resourceDefinition
        const queryDef = queries[ queryName ]

        if( !queryDef ) {
            struct['status'] = false
            struct['messages'].push( `Query "${queryName}" not found in resource` )

            return { struct }
        }

        let db = null
        let isTransient = false

        if( lifecycle === 'persistent' && schemaRef && resourceName ) {
            const result = ResourceDatabaseManager.getConnection( { schemaRef, resourceName } )
            db = result['db']
        }

        if( !db ) {
            const { database } = resourceDefinition
            const result = await ResourceDatabaseManager.openTransient( { database } )
            db = result['db']
            isTransient = true

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
                    struct
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
                stmt.bind( paramValues )

                const results = []

                while( stmt.step() ) {
                    const row = stmt.getAsObject()
                    results.push( row )
                }

                stmt.free()

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

        const handler = handlerMap || {}
        const resourceHandler = handler[ queryName ] || {}

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


    static #executeDynamicSql( { db, userParams, struct } ) {
        const userSql = userParams['sql']

        if( !userSql || typeof userSql !== 'string' ) {
            struct['status'] = false
            struct['messages'].push( 'Dynamic SQL: "sql" parameter is required and must be a string' )

            return { struct }
        }

        const trimmed = userSql.trim()

        if( !trimmed.toUpperCase().startsWith( 'SELECT' ) ) {
            struct['status'] = false
            struct['messages'].push( 'Dynamic SQL: Only SELECT statements are allowed' )

            return { struct }
        }

        const upperSql = trimmed.toUpperCase()
        const blocked = ResourceExecutor.#BLOCKED_PATTERNS
            .find( ( pattern ) => {
                const found = upperSql.includes( pattern )

                return found
            } )

        if( blocked ) {
            struct['status'] = false
            struct['messages'].push( `Dynamic SQL: Blocked pattern detected: ${blocked}` )

            return { struct }
        }

        const limit = Math.min( userParams['limit'] || 100, 1000 )
        const hasLimit = /\bLIMIT\b/i.test( trimmed )
        const finalSql = hasLimit ? trimmed : `${trimmed} LIMIT ${limit}`

        const stmt = db.prepare( finalSql )
        const results = []

        while( stmt.step() ) {
            const row = stmt.getAsObject()
            results.push( row )
        }

        stmt.free()

        struct['data'] = results

        return { struct }
    }
}


export { ResourceExecutor }
