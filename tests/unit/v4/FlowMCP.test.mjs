import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { FlowMCP } from '../../../src/v4/index.mjs'
import { ResourceDatabaseManager } from '../../../src/v4/task/ResourceDatabaseManager.mjs'
import Database from 'better-sqlite3'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'


// Test isolation (Memo 032): DBs live under the OS tmpdir, never ~/.flowmcp.
const testDbDir = join( tmpdir(), 'flowmcp-v4-facade-test' )
const memDbPath = join( testDbDir, 'tokens-mem.db' )
const fileDbPath = join( testDbDir, 'tokens-file.db' )


function seedDatabase( { path } ) {
    const db = new Database( path )
    db.exec( 'CREATE TABLE IF NOT EXISTS tokens (symbol TEXT, name TEXT, decimals INTEGER)' )
    db.exec( "INSERT INTO tokens VALUES ('ETH', 'Ethereum', 18)" )
    db.close()
}


describe( 'v4 FlowMCP facade (Memo 152 / PRD-006)', () => {
    beforeAll( () => {
        mkdirSync( testDbDir, { recursive: true } )
        seedDatabase( { path: memDbPath } )
        seedDatabase( { path: fileDbPath } )
    } )


    afterAll( () => {
        try {
            rmSync( testDbDir, { recursive: true, force: true } )
        } catch( err ) {
            // ignore cleanup errors
        }
    } )


    describe( 'A-02 — load-bearing members exist', () => {
        const members = [
            'loadSchema', 'fetch', 'executeResource', 'resolveSharedLists',
            'interpolateEnum', 'createHandlers', 'initializeResourceDbs',
            'validateMain', 'scanSecurity', 'prepareServerTool',
            'generateOutputSchema', 'buildToolName'
        ]

        members
            .forEach( ( member ) => {
                test( `FlowMCP.${member} is a static function`, () => {
                    expect( typeof FlowMCP[ member ] ).toBe( 'function' )
                } )
            } )
    } )


    describe( 'A-03 — executeResource against a sqlite fixture', () => {
        test( 'returns a struct with data for an in-memory SELECT', async () => {
            const resourceDefinition = {
                source: 'sqlite',
                mode: 'in-memory',
                description: 'Token lookup.',
                database: memDbPath,
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
                    }
                }
            }

            const { struct } = await FlowMCP.executeResource( {
                resourceDefinition,
                queryName: 'bySymbol',
                userParams: { symbol: 'ETH' },
                handlerMap: {}
            } )

            expect( struct[ 'status' ] ).toBe( true )
            expect( struct[ 'data' ].length ).toBe( 1 )
            expect( struct[ 'data' ][ 0 ][ 'symbol' ] ).toBe( 'ETH' )
        } )
    } )


    describe( 'A-04 — sqlite WRITE path exercises createBackupIfNeeded', () => {
        test( 'v4 ResourceDatabaseManager exposes createBackupIfNeeded', () => {
            expect( typeof ResourceDatabaseManager.createBackupIfNeeded ).toBe( 'function' )
        } )


        test( 'file-based write via executeResource throws no TypeError and creates a backup', async () => {
            const resourceDefinition = {
                source: 'sqlite',
                mode: 'file-based',
                description: 'Token writer.',
                database: fileDbPath,
                queries: {}
            }

            const { struct } = await FlowMCP.executeResource( {
                resourceDefinition,
                queryName: 'runSql',
                userParams: { sql: "INSERT INTO tokens VALUES ('USDC', 'USD Coin', 6)" },
                handlerMap: {}
            } )

            expect( struct[ 'status' ] ).toBe( true )
            expect( existsSync( `${fileDbPath}.bak` ) ).toBe( true )
        } )
    } )
} )
