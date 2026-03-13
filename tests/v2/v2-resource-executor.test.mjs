import { describe, test, expect } from '@jest/globals'
import { ResourceExecutor } from '../../src/v2/task/ResourceExecutor.mjs'
import { ResourceDatabaseManager } from '../../src/v2/task/ResourceDatabaseManager.mjs'
import Database from 'better-sqlite3'
import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'


const testDbDir = join( tmpdir(), 'flowmcp-test-resource-executor' )
const testDbPath = join( testDbDir, 'test-tokens.db' )

let testDbCreated = false


function ensureTestDatabase() {
    if( testDbCreated ) {
        return
    }

    mkdirSync( testDbDir, { recursive: true } )

    const db = new Database( testDbPath )

    db.exec( 'CREATE TABLE tokens (symbol TEXT, name TEXT, address TEXT, chain_id INTEGER, decimals INTEGER)' )
    db.exec( "INSERT INTO tokens VALUES ('ETH', 'Ethereum', '0x0000000000000000000000000000000000000000', 1, 18)" )
    db.exec( "INSERT INTO tokens VALUES ('USDC', 'USD Coin', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1, 6)" )
    db.exec( "INSERT INTO tokens VALUES ('USDC', 'USD Coin', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 137, 6)" )
    db.exec( "INSERT INTO tokens VALUES ('WBTC', 'Wrapped Bitcoin', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 1, 8)" )

    db.close()

    testDbCreated = true
}


const validResourceDefinition = {
    source: 'sqlite',
    mode: 'in-memory',
    description: 'Token metadata lookup.',
    database: testDbPath,
    queries: {
        bySymbol: {
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
                schema: { type: 'array', items: { type: 'object' } }
            }
        },
        byAddressAndChain: {
            sql: 'SELECT * FROM tokens WHERE address = ? AND chain_id = ?',
            description: 'Find token by address and chain',
            parameters: [
                {
                    position: { key: 'address', value: '{{USER_PARAM}}' },
                    z: { primitive: 'string()', options: [] }
                },
                {
                    position: { key: 'chainId', value: '{{USER_PARAM}}' },
                    z: { primitive: 'number()', options: [] }
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
        }
    }
}


describe( 'ResourceExecutor', () => {
    beforeAll( () => {
        ensureTestDatabase()
    } )


    afterAll( () => {
        try {
            unlinkSync( testDbPath )
        } catch( err ) {
            // ignore cleanup errors
        }
    } )


    describe( 'execute()', () => {
        test( 'returns results for a simple SELECT query', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'bySymbol',
                    userParams: { symbol: 'ETH' },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['messages'] ).toEqual( [] )
            expect( struct['data'].length ).toBe( 1 )
            expect( struct['data'][ 0 ]['symbol'] ).toBe( 'ETH' )
            expect( struct['data'][ 0 ]['name'] ).toBe( 'Ethereum' )
            expect( struct['data'][ 0 ]['decimals'] ).toBe( 18 )
        } )


        test( 'returns multiple results for matching query', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'bySymbol',
                    userParams: { symbol: 'USDC' },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'].length ).toBe( 2 )

            const chainIds = struct['data']
                .map( ( row ) => {
                    const { chain_id } = row

                    return chain_id
                } )

            expect( chainIds ).toContain( 1 )
            expect( chainIds ).toContain( 137 )
        } )


        test( 'returns results for query with multiple parameters', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'byAddressAndChain',
                    userParams: {
                        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                        chainId: 1
                    },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'].length ).toBe( 1 )
            expect( struct['data'][ 0 ]['symbol'] ).toBe( 'USDC' )
            expect( struct['data'][ 0 ]['chain_id'] ).toBe( 1 )
        } )


        test( 'returns empty array for no matching rows', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'bySymbol',
                    userParams: { symbol: 'NONEXISTENT' },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['messages'] ).toEqual( [] )
            expect( struct['data'] ).toEqual( [] )
        } )


        test( 'returns all rows for parameterless query', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'listAll',
                    userParams: {},
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'].length ).toBe( 4 )
        } )


        test( 'returns error when database file not found', async () => {
            const badDefinition = {
                ...validResourceDefinition,
                database: '/nonexistent/path/tokens.db'
            }

            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: badDefinition,
                    queryName: 'bySymbol',
                    userParams: { symbol: 'ETH' },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( false )

            const hasFileError = struct['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'Failed to open database' ) || msg.includes( 'Database file not found' )

                    return match
                } )

            expect( hasFileError ).toBe( true )
        } )


        test( 'returns error for malformed SQL', async () => {
            const badDefinition = {
                ...validResourceDefinition,
                queries: {
                    ...validResourceDefinition['queries'],
                    badQuery: {
                        sql: 'SELECTX INVALID SYNTAX FROM',
                        description: 'Bad query',
                        parameters: [],
                        output: {
                            mimeType: 'application/json',
                            schema: { type: 'array' }
                        }
                    }
                }
            }

            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: badDefinition,
                    queryName: 'badQuery',
                    userParams: {},
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( false )

            const hasSqlError = struct['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'SQL error' )

                    return match
                } )

            expect( hasSqlError ).toBe( true )
        } )


        test( 'returns error when query name not found', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'nonExistentQuery',
                    userParams: {},
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( false )

            const hasQueryError = struct['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'not found' )

                    return match
                } )

            expect( hasQueryError ).toBe( true )
        } )


        test( 'applies postRequest handler to results', async () => {
            const handlerMap = {
                bySymbol: {
                    postRequest: async ( { response, struct, payload } ) => {
                        const enriched = response
                            .map( ( row ) => {
                                const explorerUrl = `https://etherscan.io/token/${row['address']}`

                                return { ...row, explorerUrl }
                            } )

                        return { response: enriched }
                    }
                }
            }

            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'bySymbol',
                    userParams: { symbol: 'ETH' },
                    handlerMap
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'][ 0 ]['explorerUrl'] ).toContain( 'etherscan.io' )
            expect( struct['data'][ 0 ]['symbol'] ).toBe( 'ETH' )
        } )


        test( 'works without handler map', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'bySymbol',
                    userParams: { symbol: 'WBTC' },
                    handlerMap: null
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'].length ).toBe( 1 )
            expect( struct['data'][ 0 ]['symbol'] ).toBe( 'WBTC' )
        } )


        test( 'auto-injects freeQuery for in-memory mode', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'freeQuery',
                    userParams: { sql: 'SELECT * FROM tokens WHERE symbol = \'ETH\'' },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'].length ).toBe( 1 )
            expect( struct['data'][ 0 ]['symbol'] ).toBe( 'ETH' )
        } )


        test( 'freeQuery rejects non-SELECT in in-memory mode', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'freeQuery',
                    userParams: { sql: 'INSERT INTO tokens VALUES (\'TEST\', \'Test\', \'0x0\', 1, 18)' },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( false )

            const hasBlockedError = struct['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'Only SELECT' )

                    return match
                } )

            expect( hasBlockedError ).toBe( true )
        } )
    } )


    describe( 'injectFreeQuery()', () => {
        test( 'adds freeQuery when not present', () => {
            const queries = {
                getSchema: { sql: 'SELECT * FROM sqlite_master', description: 'Get schema' }
            }

            const { queries: result } = ResourceExecutor
                .injectFreeQuery( { queries, mode: 'in-memory' } )

            expect( result['freeQuery'] ).toBeDefined()
            expect( result['freeQuery']['description'] ).toContain( 'read-only' )
            expect( result['getSchema'] ).toBeDefined()
        } )


        test( 'does not overwrite existing freeQuery', () => {
            const queries = {
                freeQuery: { sql: 'custom', description: 'Custom freeQuery' }
            }

            const { queries: result } = ResourceExecutor
                .injectFreeQuery( { queries, mode: 'in-memory' } )

            expect( result['freeQuery']['description'] ).toBe( 'Custom freeQuery' )
        } )


        test( 'uses file-based description for file-based mode', () => {
            const queries = {
                getSchema: { sql: 'SELECT * FROM sqlite_master', description: 'Get schema' }
            }

            const { queries: result } = ResourceExecutor
                .injectFreeQuery( { queries, mode: 'file-based' } )

            expect( result['freeQuery']['description'] ).toContain( 'any SQL' )
        } )
    } )


    describe( 'markdown resources', () => {
        const mdTestDir = join( tmpdir(), 'flowmcp-test-md-executor' )
        const mdResourcesDir = join( mdTestDir, 'resources' )
        const mdTestFile = join( mdResourcesDir, 'test-reference.md' )

        const mdContent = `# SQL Reference

Introduction to SQL.

## Functions

List of functions:

- \`COUNT()\` — count rows
- \`SUM()\` — sum values
- \`AVG()\` — average values

## Data Types

| Type | Description |
|------|-------------|
| INTEGER | Whole number |
| TEXT | String value |
| REAL | Float value |

## Advanced

Advanced topics here.
`

        mkdirSync( mdResourcesDir, { recursive: true } )
        writeFileSync( mdTestFile, mdContent, 'utf-8' )

        const markdownResource = {
            source: 'markdown',
            origin: 'inline',
            name: 'test-reference.md',
            description: 'Test SQL reference',
            schemaDir: mdTestDir
        }


        test( 'returns full document when no params given', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: markdownResource,
                    resourceName: 'sqlReference',
                    queryName: null,
                    userParams: {},
                    handlerMap: null,
                    schemaRef: null
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'] ).toContain( '# SQL Reference' )
            expect( struct['data'] ).toContain( '## Functions' )
        } )


        test( 'returns section content when section param given', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: markdownResource,
                    resourceName: 'sqlReference',
                    queryName: null,
                    userParams: { section: '## Functions' },
                    handlerMap: null,
                    schemaRef: null
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'] ).toContain( '## Functions' )
            expect( struct['data'] ).toContain( 'COUNT()' )
            expect( struct['data'] ).not.toContain( '## Data Types' )
        } )


        test( 'returns error when section not found', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: markdownResource,
                    resourceName: 'sqlReference',
                    queryName: null,
                    userParams: { section: '## Nonexistent' },
                    handlerMap: null,
                    schemaRef: null
                } )

            expect( struct['status'] ).toBe( false )
            expect( struct['messages'][0] ).toContain( 'not found' )
        } )


        test( 'returns line range when lines param given', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: markdownResource,
                    resourceName: 'sqlReference',
                    queryName: null,
                    userParams: { lines: '1-3' },
                    handlerMap: null,
                    schemaRef: null
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'] ).toContain( '# SQL Reference' )
        } )


        test( 'returns error for invalid lines format', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: markdownResource,
                    resourceName: 'sqlReference',
                    queryName: null,
                    userParams: { lines: 'invalid' },
                    handlerMap: null,
                    schemaRef: null
                } )

            expect( struct['status'] ).toBe( false )
            expect( struct['messages'][0] ).toContain( 'from-to' )
        } )


        test( 'returns search results when search param given', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: markdownResource,
                    resourceName: 'sqlReference',
                    queryName: null,
                    userParams: { search: 'COUNT' },
                    handlerMap: null,
                    schemaRef: null
                } )

            expect( struct['status'] ).toBe( true )
            expect( Array.isArray( struct['data'] ) ).toBe( true )
            expect( struct['data'].length ).toBeGreaterThan( 0 )
            expect( struct['data'][0]['content'] ).toContain( 'COUNT' )
        } )


        test( 'returns error when markdown file not found', async () => {
            const missingResource = {
                source: 'markdown',
                origin: 'inline',
                name: 'nonexistent.md',
                description: 'Missing file',
                schemaDir: mdTestDir
            }

            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: missingResource,
                    resourceName: 'sqlReference',
                    queryName: null,
                    userParams: {},
                    handlerMap: null,
                    schemaRef: null
                } )

            expect( struct['status'] ).toBe( false )
            expect( struct['messages'][0] ).toContain( 'Failed to read' )
        } )
    } )
} )
