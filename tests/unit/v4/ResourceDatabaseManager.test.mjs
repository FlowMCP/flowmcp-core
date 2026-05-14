import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import Database from 'better-sqlite3'
import { existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ResourceDatabaseManager } from '../../../src/v4/task/ResourceDatabaseManager.mjs'


let tempDir = null
let validDbPath = null
let fileBasedDbPath = null
let missingPath = null


function createSqliteFile( { filePath } ) {
    const db = new Database( filePath )
    db.exec( 'CREATE TABLE IF NOT EXISTS t ( id INTEGER PRIMARY KEY )' )
    db.close()
}


describe( 'ResourceDatabaseManager (v4)', () => {

    beforeAll( () => {
        tempDir = mkdtempSync( join( tmpdir(), 'rdm-v4-' ) )
        validDbPath = join( tempDir, 'http-source.sqlite' )
        fileBasedDbPath = join( tempDir, 'file-based.sqlite' )
        missingPath = join( tempDir, 'does-not-exist.sqlite' )

        createSqliteFile( { filePath: validDbPath } )
        createSqliteFile( { filePath: fileBasedDbPath } )
    } )


    afterAll( () => {
        ResourceDatabaseManager.closeAll()

        if( tempDir !== null && existsSync( tempDir ) ) {
            rmSync( tempDir, { recursive: true, force: true } )
        }
    } )


    beforeEach( () => {
        ResourceDatabaseManager.closeAll()
    } )


    describe( 'initialize() — source: http', () => {

        it( 'opens a connection when local file exists', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: {
                        source: 'http',
                        path: validDbPath,
                        url: 'https://example.com/sdn.sqlite'
                    }
                },
                schemaRef: 'test::case1'
            } )

            expect( result.status ).toBe( true )
            expect( result.messages ).toHaveLength( 0 )

            const { count } = ResourceDatabaseManager.getConnectionCount()
            expect( count ).toBe( 1 )

            const { db, mode } = ResourceDatabaseManager.getConnection( {
                schemaRef: 'test::case1',
                resourceName: 'sdn'
            } )
            expect( db ).not.toBeNull()
            expect( mode ).toBe( 'readonly' )
        } )


        it( 'RES010: fails when local file does not exist', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: {
                        source: 'http',
                        path: missingPath,
                        url: 'https://example.com/sdn.sqlite'
                    }
                },
                schemaRef: 'test::case2'
            } )

            expect( result.status ).toBe( false )
            expect( result.messages.length ).toBeGreaterThan( 0 )
            expect( result.messages.some( ( m ) => m.includes( 'RES010' ) ) ).toBe( true )
            expect( result.messages.some( ( m ) => m.includes( 'Core does not download' ) ) ).toBe( true )
        } )


        it( 'RES010: fails when path is missing', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: {
                        source: 'http',
                        url: 'https://example.com/sdn.sqlite'
                    }
                },
                schemaRef: 'test::case3'
            } )

            expect( result.status ).toBe( false )
            expect( result.messages.some( ( m ) => m.includes( 'RES010' ) ) ).toBe( true )
            expect( result.messages.some( ( m ) => m.includes( "requires 'path'" ) ) ).toBe( true )
        } )


        it( 'RES010: fails when path is empty string', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: {
                        source: 'http',
                        path: '',
                        url: 'https://example.com/sdn.sqlite'
                    }
                },
                schemaRef: 'test::case3b'
            } )

            expect( result.status ).toBe( false )
            expect( result.messages.some( ( m ) => m.includes( 'RES010' ) ) ).toBe( true )
        } )


        it( 'stores the url as sourceUrl in the connection entry', async () => {
            const sourceUrl = 'https://cdn.example.com/ofac-sdn.sqlite'
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: {
                        source: 'http',
                        path: validDbPath,
                        url: sourceUrl
                    }
                },
                schemaRef: 'test::case4'
            } )

            expect( result.status ).toBe( true )

            const connection = ResourceDatabaseManager.getConnection( {
                schemaRef: 'test::case4',
                resourceName: 'sdn'
            } )

            expect( connection.sourceUrl ).toBe( sourceUrl )
        } )


        it( 'sourceUrl is null when url is not provided', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: {
                        source: 'http',
                        path: validDbPath
                    }
                },
                schemaRef: 'test::case4b'
            } )

            expect( result.status ).toBe( true )

            const connection = ResourceDatabaseManager.getConnection( {
                schemaRef: 'test::case4b',
                resourceName: 'sdn'
            } )

            expect( connection.sourceUrl ).toBeNull()
        } )


        it( 'skips re-initialization when the connection already exists', async () => {
            await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: { source: 'http', path: validDbPath, url: 'https://example.com/x.sqlite' }
                },
                schemaRef: 'test::case4c'
            } )

            const firstCount = ResourceDatabaseManager.getConnectionCount().count

            await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: { source: 'http', path: validDbPath, url: 'https://example.com/x.sqlite' }
                },
                schemaRef: 'test::case4c'
            } )

            const secondCount = ResourceDatabaseManager.getConnectionCount().count
            expect( secondCount ).toBe( firstCount )
        } )

    } )


    describe( 'initialize() — source: sqlite (v2 compatibility)', () => {

        it( 'opens a file-based sqlite connection (legacy behavior)', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    legacy: {
                        source: 'sqlite',
                        mode: 'file-based',
                        database: fileBasedDbPath
                    }
                },
                schemaRef: 'test::case5'
            } )

            expect( result.status ).toBe( true )
            expect( result.messages ).toHaveLength( 0 )

            const { db, mode } = ResourceDatabaseManager.getConnection( {
                schemaRef: 'test::case5',
                resourceName: 'legacy'
            } )
            expect( db ).not.toBeNull()
            expect( mode ).toBe( 'file-based' )
        } )


        it( 'rejects resources with unknown source types (RES001)', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    weird: { source: 'unknown-type' }
                },
                schemaRef: 'test::case6'
            } )

            expect( result.status ).toBe( false )
            expect( result.messages.some( ( m ) => m.startsWith( 'RES001' ) ) ).toBe( true )
            expect( ResourceDatabaseManager.getConnectionCount().count ).toBe( 0 )
        } )

        it( 'accepts source: markdown without creating a connection', async () => {
            const result = await ResourceDatabaseManager.initialize( {
                resources: {
                    docRef: { source: 'markdown' }
                },
                schemaRef: 'test::case7'
            } )

            expect( result.status ).toBe( true )
            expect( ResourceDatabaseManager.getConnectionCount().count ).toBe( 0 )
        } )

    } )


    describe( 'getConnection()', () => {

        it( 'returns nulls when no connection exists', () => {
            const connection = ResourceDatabaseManager.getConnection( {
                schemaRef: 'test::unknown',
                resourceName: 'missing'
            } )

            expect( connection.db ).toBeNull()
            expect( connection.mode ).toBeNull()
            expect( connection.sourceUrl ).toBeNull()
        } )

    } )


    describe( 'closeAll()', () => {

        it( 'closes all open connections and clears the registry', async () => {
            await ResourceDatabaseManager.initialize( {
                resources: {
                    sdn: { source: 'http', path: validDbPath, url: 'https://x' }
                },
                schemaRef: 'test::case7'
            } )

            expect( ResourceDatabaseManager.getConnectionCount().count ).toBe( 1 )

            ResourceDatabaseManager.closeAll()

            expect( ResourceDatabaseManager.getConnectionCount().count ).toBe( 0 )
        } )

    } )


    describe( 'basisFolder accessors', () => {

        it( 'returns the default basisFolder', () => {
            const { basisFolder } = ResourceDatabaseManager.getBasisFolder()
            expect( typeof basisFolder ).toBe( 'string' )
            expect( basisFolder.length ).toBeGreaterThan( 0 )
        } )


        it( 'allows setting the basisFolder', () => {
            const { basisFolder: original } = ResourceDatabaseManager.getBasisFolder()
            ResourceDatabaseManager.setBasisFolder( { basisFolder: 'custom-folder' } )
            const { basisFolder } = ResourceDatabaseManager.getBasisFolder()
            expect( basisFolder ).toBe( 'custom-folder' )
            ResourceDatabaseManager.setBasisFolder( { basisFolder: original } )
        } )

    } )

} )
