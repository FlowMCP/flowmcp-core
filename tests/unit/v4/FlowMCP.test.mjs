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


    // Memo 152 / PRD-010, F-04 — the facade grading mindestcontract (verbatim from
    // flowmcp-grading DataPretest mock): fetch, executeResource, resolveSharedLists,
    // createHandlers — each with at least one positive test against the v4 facade.
    describe( 'F-04 — grading mindestcontract methods', () => {
        test( 'fetch executes a mocked handler and returns a struct', async () => {
            const main = {
                namespace: 'facadefetch',
                root: 'https://api.example.com',
                tools: { getThing: { method: 'GET', path: '/thing', description: 'd', parameters: [] } }
            }
            const handlerMap = {
                getThing: { executeRequest: async ( { struct } ) => ( { struct, response: { ok: true } } ) }
            }

            const struct = await FlowMCP.fetch( {
                main, handlerMap, userParams: {}, serverParams: {}, routeName: 'getThing'
            } )

            expect( struct[ 'status' ] ).toBe( true )
            expect( struct[ 'data' ] ).toEqual( { ok: true } )
        } )


        test( 'resolveSharedLists returns an empty object for no refs', async () => {
            const { sharedLists } = await FlowMCP.resolveSharedLists( {
                sharedListRefs: [],
                listsDir: null
            } )

            expect( sharedLists ).toEqual( {} )
        } )


        test( 'createHandlers wires a route handler map', () => {
            const { handlerMap } = FlowMCP.createHandlers( {
                handlersFn: () => ( { getThing: { postRequest: async ( { struct } ) => ( { struct } ) } } ),
                sharedLists: {},
                libraries: {},
                routeNames: [ 'getThing' ],
                resources: {}
            } )

            expect( handlerMap[ 'getThing' ] ).toBeDefined()
            expect( typeof handlerMap[ 'getThing' ][ 'postRequest' ] ).toBe( 'function' )
        } )


        test( 'executeResource is exercised above (A-03/A-04)', () => {
            expect( typeof FlowMCP.executeResource ).toBe( 'function' )
        } )
    } )


    // Memo 152 / PRD-010, F-01 — nucleus ported from tests/v2/v2-resource-db-init
    // (initializeResourceDbs regression #85), now against the v4 facade.
    describe( 'initializeResourceDbs (regression #85)', () => {
        test( 'does not throw when called through the public wrapper', async () => {
            const result = await FlowMCP
                .initializeResourceDbs( { resources: {}, schemaRef: 'regression-85' } )

            expect( result ).toBeDefined()
        } )


        test( 'ignores non-sqlite resources without touching any connection', async () => {
            const resources = {
                someDoc: { source: 'markdown', origin: 'project', name: 'doc.md' }
            }

            const result = await FlowMCP
                .initializeResourceDbs( { resources, schemaRef: 'regression-85-non-sqlite' } )

            expect( result ).toBeDefined()
        } )
    } )
} )
