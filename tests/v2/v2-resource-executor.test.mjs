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


        test( 'auto-injects runSql for in-memory mode', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'runSql',
                    userParams: { sql: 'SELECT * FROM tokens WHERE symbol = \'ETH\'' },
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'].length ).toBe( 1 )
            expect( struct['data'][ 0 ]['symbol'] ).toBe( 'ETH' )
        } )


        test( 'runSql rejects non-SELECT in in-memory mode', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'runSql',
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


        test( 'auto-injects describeTables and returns structured rows', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'describeTables',
                    userParams: {},
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )
            expect( Array.isArray( struct['data'] ) ).toBe( true )

            const tokenSymbolRow = struct['data']
                .find( ( row ) => {
                    const match = row['table_name'] === 'tokens' && row['column'] === 'symbol'

                    return match
                } )

            expect( tokenSymbolRow ).toBeDefined()
            expect( tokenSymbolRow['type'] ).toBe( 'TEXT' )
        } )
    } )


    describe( 'injectRunSql()', () => {
        test( 'adds runSql when not present', () => {
            const queries = {
                getSchema: { sql: 'SELECT * FROM sqlite_master', description: 'Get schema' }
            }

            const { queries: result } = ResourceExecutor
                .injectRunSql( { queries, mode: 'in-memory' } )

            expect( result['runSql'] ).toBeDefined()
            expect( result['runSql']['description'] ).toContain( 'read-only' )
            expect( result['getSchema'] ).toBeDefined()
        } )


        test( 'does not overwrite existing runSql', () => {
            const queries = {
                runSql: { sql: 'custom', description: 'Custom runSql' }
            }

            const { queries: result } = ResourceExecutor
                .injectRunSql( { queries, mode: 'in-memory' } )

            expect( result['runSql']['description'] ).toBe( 'Custom runSql' )
        } )


        test( 'uses file-based description for file-based mode', () => {
            const queries = {
                getSchema: { sql: 'SELECT * FROM sqlite_master', description: 'Get schema' }
            }

            const { queries: result } = ResourceExecutor
                .injectRunSql( { queries, mode: 'file-based' } )

            expect( result['runSql']['description'] ).toContain( 'any SQL' )
        } )
    } )


    describe( 'injectDescribeTables()', () => {
        test( 'adds describeTables when not present', () => {
            const queries = {
                bySymbol: { sql: 'SELECT * FROM tokens WHERE symbol = ?', description: 'Find by symbol' }
            }

            const { queries: result } = ResourceExecutor
                .injectDescribeTables( { queries } )

            expect( result['describeTables'] ).toBeDefined()
            expect( result['describeTables']['sql'] ).toContain( 'sqlite_master' )
            expect( result['describeTables']['sql'] ).toContain( 'pragma_table_info' )
            expect( result['bySymbol'] ).toBeDefined()
        } )


        test( 'does not overwrite existing describeTables', () => {
            const queries = {
                describeTables: { sql: 'CUSTOM', description: 'Custom describe' }
            }

            const { queries: result } = ResourceExecutor
                .injectDescribeTables( { queries } )

            expect( result['describeTables']['sql'] ).toBe( 'CUSTOM' )
            expect( result['describeTables']['description'] ).toBe( 'Custom describe' )
        } )


        test( 'describeTables SQL returns table_name, column, type from real DB', async () => {
            const { struct } = await ResourceExecutor
                .execute( {
                    resourceDefinition: validResourceDefinition,
                    queryName: 'describeTables',
                    userParams: {},
                    handlerMap: {}
                } )

            expect( struct['status'] ).toBe( true )

            const rows = struct['data']
            const hasTableNameKey = rows.every( ( row ) => {
                const match = 'table_name' in row && 'column' in row && 'type' in row

                return match
            } )

            expect( hasTableNameKey ).toBe( true )

            const tokensRow = rows.find( ( row ) => {
                const match = row['table_name'] === 'tokens' && row['column'] === 'address'

                return match
            } )

            expect( tokensRow ).toBeDefined()
            expect( tokensRow['type'] ).toBe( 'TEXT' )
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
