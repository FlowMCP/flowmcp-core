class ResourceValidator {
    static validate( { resources } ) {
        const messages = []

        if( resources === undefined || resources === null ) {
            messages.push( 'resources: Missing export' )

            return { status: false, messages }
        }

        if( typeof resources !== 'object' || Array.isArray( resources ) ) {
            messages.push( 'resources: Must be a plain object' )

            return { status: false, messages }
        }

        const resourceNames = Object.keys( resources )

        if( resourceNames.length > 2 ) {
            messages.push( `resources: Maximum 2 resources allowed, got ${resourceNames.length}` )

            return { status: false, messages }
        }

        const namePattern = /^[a-z][a-zA-Z0-9]*$/

        resourceNames
            .forEach( ( resourceName ) => {
                if( !namePattern.test( resourceName ) ) {
                    messages.push( `resources.${resourceName}: Name must match pattern /^[a-z][a-zA-Z0-9]*$/ (camelCase)` )
                }
            } )

        if( messages.length > 0 ) {
            return { status: false, messages }
        }

        resourceNames
            .forEach( ( resourceName ) => {
                const resource = resources[ resourceName ]
                const prefix = `resources.${resourceName}`

                ResourceValidator.#validateSingleResource( { resource, prefix, messages } )
            } )

        const status = messages.length === 0

        return { status, messages }
    }


    static #validateSingleResource( { resource, prefix, messages } ) {
        if( resource['source'] === undefined || resource['source'] === null ) {
            messages.push( `${prefix}.source: Missing required field` )
        } else if( resource['source'] !== 'sqlite' ) {
            messages.push( `${prefix}.source: Must be "sqlite", got "${resource['source']}"` )
        }

        if( resource['description'] === undefined || resource['description'] === null ) {
            messages.push( `${prefix}.description: Missing required field` )
        } else if( typeof resource['description'] !== 'string' || resource['description'].trim() === '' ) {
            messages.push( `${prefix}.description: Must be a non-empty string` )
        }

        if( resource['database'] === undefined || resource['database'] === null ) {
            messages.push( `${prefix}.database: Missing required field` )
        } else if( typeof resource['database'] !== 'string' ) {
            messages.push( `${prefix}.database: Must be type "string"` )
        } else if( !resource['database'].endsWith( '.db' ) ) {
            messages.push( `${prefix}.database: Must end with ".db", got "${resource['database']}"` )
        }

        if( resource['queries'] === undefined || resource['queries'] === null ) {
            messages.push( `${prefix}.queries: Missing required field` )

            return
        }

        if( typeof resource['queries'] !== 'object' || Array.isArray( resource['queries'] ) ) {
            messages.push( `${prefix}.queries: Must be a plain object` )

            return
        }

        const queryNames = Object.keys( resource['queries'] )

        if( queryNames.length > 4 ) {
            messages.push( `${prefix}.queries: Maximum 4 queries allowed, got ${queryNames.length}` )

            return
        }

        const queryNamePattern = /^[a-z][a-zA-Z0-9]*$/

        queryNames
            .forEach( ( queryName ) => {
                if( !queryNamePattern.test( queryName ) ) {
                    messages.push( `${prefix}.queries.${queryName}: Name must match pattern /^[a-z][a-zA-Z0-9]*$/ (camelCase)` )
                }

                const query = resource['queries'][ queryName ]
                const queryPrefix = `${prefix}.queries.${queryName}`

                ResourceValidator.#validateSingleQuery( { query, prefix: queryPrefix, messages } )
            } )
    }


    static #validateSingleQuery( { query, prefix, messages } ) {
        if( query['sql'] === undefined || query['sql'] === null ) {
            messages.push( `${prefix}.sql: Missing required field` )
        } else if( typeof query['sql'] !== 'string' || query['sql'].trim() === '' ) {
            messages.push( `${prefix}.sql: Must be a non-empty string` )
        } else {
            ResourceValidator.#validateSqlSecurity( { sql: query['sql'], prefix, messages } )
        }

        if( query['description'] === undefined || query['description'] === null ) {
            messages.push( `${prefix}.description: Missing required field` )
        } else if( typeof query['description'] !== 'string' ) {
            messages.push( `${prefix}.description: Must be type "string"` )
        }

        if( query['parameters'] === undefined ) {
            messages.push( `${prefix}.parameters: Missing required field` )
        } else if( !Array.isArray( query['parameters'] ) ) {
            messages.push( `${prefix}.parameters: Must be an array` )
        } else {
            query['parameters']
                .forEach( ( param, index ) => {
                    ResourceValidator.#validateParameter( {
                        param,
                        prefix: `${prefix}.parameters[${index}]`,
                        messages
                    } )
                } )
        }

        if( query['output'] === undefined || query['output'] === null ) {
            messages.push( `${prefix}.output: Missing required field` )
        } else if( typeof query['output'] !== 'object' || Array.isArray( query['output'] ) ) {
            messages.push( `${prefix}.output: Must be a plain object` )
        } else {
            ResourceValidator.#validateOutput( {
                output: query['output'],
                prefix: `${prefix}.output`,
                messages
            } )
        }
    }


    static #validateSqlSecurity( { sql, prefix, messages } ) {
        const trimmed = sql.trim()

        if( !/^SELECT/i.test( trimmed ) ) {
            messages.push( `${prefix}.sql: Must begin with SELECT` )
        }

        const blockedPatterns = [
            { pattern: /ATTACH\s+DATABASE/i, label: 'ATTACH DATABASE' },
            { pattern: /LOAD_EXTENSION/i, label: 'LOAD_EXTENSION' },
            { pattern: /PRAGMA/i, label: 'PRAGMA' },
            { pattern: /CREATE\s+(TABLE|INDEX|VIEW|TRIGGER)/i, label: 'CREATE' },
            { pattern: /ALTER\s+TABLE/i, label: 'ALTER TABLE' },
            { pattern: /DROP\s+(TABLE|INDEX|VIEW|TRIGGER)/i, label: 'DROP' },
            { pattern: /INSERT\s+INTO/i, label: 'INSERT INTO' },
            { pattern: /UPDATE\s+\w+\s+SET/i, label: 'UPDATE' },
            { pattern: /DELETE\s+FROM/i, label: 'DELETE FROM' }
        ]

        blockedPatterns
            .forEach( ( { pattern, label } ) => {
                if( pattern.test( sql ) ) {
                    messages.push( `${prefix}.sql: Blocked SQL pattern detected: ${label}` )
                }
            } )
    }


    static #validateParameter( { param, prefix, messages } ) {
        if( !param['position'] ) {
            messages.push( `${prefix}.position: Missing required field` )
        } else {
            const { position } = param

            if( !position['key'] ) {
                messages.push( `${prefix}.position.key: Missing required field` )
            }

            if( !position['value'] ) {
                messages.push( `${prefix}.position.value: Missing required field` )
            }

            if( position['location'] !== undefined ) {
                messages.push( `${prefix}.position.location: Resource parameters must not have a location field` )
            }
        }

        if( !param['z'] ) {
            messages.push( `${prefix}.z: Missing required field` )
        } else {
            const { z } = param

            if( !z['primitive'] ) {
                messages.push( `${prefix}.z.primitive: Missing required field` )
            }

            if( z['options'] !== undefined && !Array.isArray( z['options'] ) ) {
                messages.push( `${prefix}.z.options: Must be an array` )
            }
        }
    }


    static #validateOutput( { output, prefix, messages } ) {
        if( !output['mimeType'] ) {
            messages.push( `${prefix}.mimeType: Missing required field` )
        }

        if( !output['schema'] ) {
            messages.push( `${prefix}.schema: Missing required field` )
        } else if( typeof output['schema'] !== 'object' || Array.isArray( output['schema'] ) ) {
            messages.push( `${prefix}.schema: Must be a plain object` )
        }
    }
}


export { ResourceValidator }
