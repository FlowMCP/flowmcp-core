import initSqlJs from 'sql.js'
import { readFileSync } from 'node:fs'


class ResourceExecutor {
    static async execute( { resourceDefinition, queryName, userParams, handlerMap } ) {
        const struct = {
            status: true,
            messages: [],
            data: null
        }

        const { database, queries } = resourceDefinition
        const queryDef = queries[ queryName ]

        if( !queryDef ) {
            struct['status'] = false
            struct['messages'].push( `Query "${queryName}" not found in resource` )

            return { struct }
        }

        let db = null

        try {
            const SQL = await initSqlJs()
            let buffer = null

            try {
                buffer = readFileSync( database )
            } catch( fileError ) {
                struct['status'] = false
                struct['messages'].push( `Database file not found: ${database}` )

                return { struct }
            }

            db = new SQL.Database( buffer )

            const { sql, parameters } = queryDef

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
        } catch( sqlError ) {
            struct['status'] = false
            struct['messages'].push( `SQL error: ${sqlError.message}` )

            return { struct }
        } finally {
            if( db ) {
                db.close()
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
}


export { ResourceExecutor }
