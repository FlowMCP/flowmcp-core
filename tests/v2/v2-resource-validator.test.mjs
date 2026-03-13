import { describe, test, expect } from '@jest/globals'
import { ResourceValidator } from '../../src/v2/task/ResourceValidator.mjs'


const validQuery = {
    sql: 'SELECT * FROM tokens WHERE symbol = ?',
    description: 'Find tokens by symbol',
    parameters: [
        {
            position: { key: 'symbol', value: '{{USER_PARAM}}' },
            z: { primitive: 'string()', options: [ 'min(1)' ] }
        }
    ],
    output: {
        mimeType: 'application/json',
        schema: {
            type: 'array',
            items: { type: 'object' }
        }
    }
}


const validResource = {
    tokenLookup: {
        source: 'sqlite',
        description: 'Token metadata lookup by symbol.',
        database: './data/tokens.db',
        queries: {
            bySymbol: { ...validQuery }
        }
    }
}


describe( 'ResourceValidator', () => {
    describe( 'validate()', () => {
        test( 'passes a valid resource definition', () => {
            const { status, messages } = ResourceValidator
                .validate( { resources: validResource } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails when resources is null', () => {
            const { status, messages } = ResourceValidator
                .validate( { resources: null } )

            expect( status ).toBe( false )
            expect( messages ).toContain( 'resources: Missing export' )
        } )


        test( 'fails when resources is undefined', () => {
            const { status, messages } = ResourceValidator
                .validate( { resources: undefined } )

            expect( status ).toBe( false )
            expect( messages ).toContain( 'resources: Missing export' )
        } )


        test( 'fails when resources is not a plain object', () => {
            const { status, messages } = ResourceValidator
                .validate( { resources: [ 'array' ] } )

            expect( status ).toBe( false )
            expect( messages ).toContain( 'resources: Must be a plain object' )
        } )


        test( 'fails when source is not sqlite', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    source: 'postgres'
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'source' ) && msg.includes( '"sqlite"' )

                    return match
                } )

            expect( hasSourceError ).toBe( true )
        } )


        test( 'fails when source is missing', () => {
            const { source, ...rest } = validResource['tokenLookup']
            const resources = { tokenLookup: rest }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'source' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasSourceError ).toBe( true )
        } )


        test( 'fails when description is missing', () => {
            const { description, ...rest } = validResource['tokenLookup']
            const resources = { tokenLookup: rest }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'description' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'fails when description is empty', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    description: '   '
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'description' ) && msg.includes( 'non-empty' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'fails when database is missing', () => {
            const { database, ...rest } = validResource['tokenLookup']
            const resources = { tokenLookup: rest }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasDbError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'database' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasDbError ).toBe( true )
        } )


        test( 'fails when database does not end with .db', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    database: './data/tokens.sqlite'
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasDbError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'database' ) && msg.includes( '.db' )

                    return match
                } )

            expect( hasDbError ).toBe( true )
        } )


        test( 'fails when more than 6 queries', () => {
            const queries = {}
            const queryNames = [ 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7' ]
            queryNames
                .forEach( ( name ) => {
                    queries[ name ] = { ...validQuery }
                } )

            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasQueryError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Maximum 6 queries' )

                    return match
                } )

            expect( hasQueryError ).toBe( true )
        } )


        test( 'fails when more than 2 resources', () => {
            const resources = {
                res1: { ...validResource['tokenLookup'] },
                res2: { ...validResource['tokenLookup'] },
                res3: { ...validResource['tokenLookup'] }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasLimitError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Maximum 2 resources' )

                    return match
                } )

            expect( hasLimitError ).toBe( true )
        } )
    } )


    describe( 'SQL security', () => {
        test( 'blocks ATTACH DATABASE', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: "SELECT 1; ATTACH DATABASE '/etc/passwd' AS leak"
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'ATTACH DATABASE' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks LOAD_EXTENSION', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: "SELECT LOAD_EXTENSION('malicious.so')"
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'LOAD_EXTENSION' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks PRAGMA', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: 'PRAGMA table_info(tokens)'
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'PRAGMA' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks INSERT INTO', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: "INSERT INTO tokens (symbol) VALUES ('ETH')"
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'INSERT INTO' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks DROP TABLE', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: 'SELECT 1; DROP TABLE tokens'
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'DROP' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks CREATE TABLE', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: 'CREATE TABLE evil (id INTEGER)'
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'CREATE' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks ALTER TABLE', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: 'ALTER TABLE tokens ADD COLUMN evil TEXT'
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'ALTER TABLE' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks UPDATE SET', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: "UPDATE tokens SET symbol = 'EVIL'"
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'UPDATE' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks DELETE FROM', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: 'DELETE FROM tokens WHERE id = 1'
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'DELETE FROM' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'blocks case-insensitive SQL patterns', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: "select 1; attach   database '/etc/passwd' as leak"
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSecurityError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'ATTACH DATABASE' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )


        test( 'rejects SQL that does not start with SELECT or WITH', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: 'EXPLAIN SELECT * FROM tokens'
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSelectError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Must begin with SELECT or WITH' )

                    return match
                } )

            expect( hasSelectError ).toBe( true )
        } )


        test( 'accepts SQL that starts with WITH (CTE)', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            sql: 'WITH cte AS (SELECT 1) SELECT * FROM cte'
                        }
                    }
                }
            }

            const { status } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'parameter validation', () => {
        test( 'fails when parameter has location field', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            parameters: [
                                {
                                    position: { key: 'symbol', value: '{{USER_PARAM}}', location: 'query' },
                                    z: { primitive: 'string()', options: [ 'min(1)' ] }
                                }
                            ]
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasLocationError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'location' ) && msg.includes( 'must not' )

                    return match
                } )

            expect( hasLocationError ).toBe( true )
        } )


        test( 'fails when parameter position is missing', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            parameters: [
                                { z: { primitive: 'string()', options: [] } }
                            ]
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasPositionError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'position' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasPositionError ).toBe( true )
        } )


        test( 'fails when parameter z block is missing', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            parameters: [
                                { position: { key: 'symbol', value: '{{USER_PARAM}}' } }
                            ]
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasZError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.z' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasZError ).toBe( true )
        } )


        test( 'passes with valid parameters without location', () => {
            const { status, messages } = ResourceValidator
                .validate( { resources: validResource } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )
    } )


    describe( 'query validation', () => {
        test( 'fails when sql is missing', () => {
            const { sql, ...queryRest } = validQuery
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: { bySymbol: queryRest }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSqlError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'sql' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasSqlError ).toBe( true )
        } )


        test( 'fails when query description is missing', () => {
            const { description, ...queryRest } = validQuery
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: { bySymbol: queryRest }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'description' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'fails when parameters array is missing from query', () => {
            const { parameters, ...queryRest } = validQuery
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: { bySymbol: queryRest }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasParamError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'parameters' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasParamError ).toBe( true )
        } )


        test( 'fails when output is missing from query', () => {
            const { output, ...queryRest } = validQuery
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: { bySymbol: queryRest }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasOutputError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'output' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasOutputError ).toBe( true )
        } )


        test( 'fails when output schema is missing', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        bySymbol: {
                            ...validQuery,
                            output: { mimeType: 'application/json' }
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasSchemaError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'schema' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasSchemaError ).toBe( true )
        } )
    } )


    describe( 'multiple errors collected', () => {
        test( 'collects multiple validation errors at once', () => {
            const resources = {
                tokenLookup: {
                    source: 'postgres',
                    description: '',
                    database: './data/tokens.sqlite',
                    queries: {
                        bySymbol: {
                            sql: 'SELECT * FROM tokens WHERE symbol = ?',
                            description: 'Find tokens',
                            parameters: [],
                            output: {
                                mimeType: 'application/json',
                                schema: { type: 'array' }
                            }
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )
            expect( messages.length ).toBeGreaterThanOrEqual( 3 )

            const hasSourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'source' )

                    return match
                } )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'description' ) && msg.includes( 'non-empty' )

                    return match
                } )

            const hasDbError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'database' ) && msg.includes( '.db' )

                    return match
                } )

            expect( hasSourceError ).toBe( true )
            expect( hasDescError ).toBe( true )
            expect( hasDbError ).toBe( true )
        } )
    } )


    describe( 'resource with multiple queries', () => {
        test( 'passes resource with 4 valid queries', () => {
            const resources = {
                tokenLookup: {
                    source: 'sqlite',
                    description: 'Token metadata lookup.',
                    database: './data/tokens.db',
                    queries: {
                        bySymbol: { ...validQuery },
                        byAddress: {
                            sql: 'SELECT * FROM tokens WHERE address = ?',
                            description: 'Find by address',
                            parameters: [
                                {
                                    position: { key: 'address', value: '{{USER_PARAM}}' },
                                    z: { primitive: 'string()', options: [] }
                                }
                            ],
                            output: {
                                mimeType: 'application/json',
                                schema: { type: 'array', items: { type: 'object' } }
                            }
                        },
                        listAll: {
                            sql: 'SELECT * FROM tokens ORDER BY symbol',
                            description: 'List all tokens',
                            parameters: [],
                            output: {
                                mimeType: 'application/json',
                                schema: { type: 'array', items: { type: 'object' } }
                            }
                        },
                        byChain: {
                            sql: 'SELECT * FROM tokens WHERE chain_id = ?',
                            description: 'Find by chain',
                            parameters: [
                                {
                                    position: { key: 'chainId', value: '{{USER_PARAM}}' },
                                    z: { primitive: 'number()', options: [] }
                                }
                            ],
                            output: {
                                mimeType: 'application/json',
                                schema: { type: 'array', items: { type: 'object' } }
                            }
                        }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )
    } )


    describe( 'naming conventions', () => {
        test( 'fails when resource name is not camelCase', () => {
            const resources = {
                'Token-Lookup': { ...validResource['tokenLookup'] }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasNameError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Token-Lookup' ) && msg.includes( 'camelCase' )

                    return match
                } )

            expect( hasNameError ).toBe( true )
        } )


        test( 'fails when query name is not camelCase', () => {
            const resources = {
                tokenLookup: {
                    ...validResource['tokenLookup'],
                    queries: {
                        'By-Symbol': { ...validQuery }
                    }
                }
            }

            const { status, messages } = ResourceValidator
                .validate( { resources } )

            expect( status ).toBe( false )

            const hasNameError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'By-Symbol' ) && msg.includes( 'camelCase' )

                    return match
                } )

            expect( hasNameError ).toBe( true )
        } )
    } )
} )
