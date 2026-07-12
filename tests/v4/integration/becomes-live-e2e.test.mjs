import { describe, test, expect, afterAll } from '@jest/globals'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'

import { Pipeline, ResourceExecutor, ResourceDatabaseManager } from '../../../src/v4/index.mjs'


// Memo 152 / PRD-027 (G-06) — Becomes-live-Set end-to-end hardening.
//
// Under v4-only the v4 Pipeline is THE production loader (its first production consumer is
// `flowmcp private call`, PrivateCommand -> Pipeline.load). Before Memo 152 the Becomes-live
// modules (v4 Pipeline, PrefillExecutor, PlaceholderResolver, SelectionLoader,
// SkillContentGenerator, v4 ResourceDatabaseManager) were only unit-tested against the
// disconnected module; no test drove them THROUGH Pipeline.load (research-03 A1 / r6 gap G5).
//
// This suite drives Pipeline.load via the package v4 surface (src/v4/index.mjs — the same export
// the CLI consumes as `import { Pipeline } from 'flowmcp'`), so each reachable module is exercised
// on the real load path, not by a direct module import. The RDM write-time backup path is driven
// through ResourceExecutor.execute (the production resource-write path).
//
// HONEST SCOPE (No-Fake-E2E): the v4 schema shape FORBIDS main.skills (MainValidator VAL016).
// Pipeline.load therefore always runs its skills stage with an EMPTY skills set, so PrefillExecutor
// and the PlaceholderResolver skill-content branch are NOT reachable through a validating schema.
// The "v4 Pipeline forbids main.skills" test below pins that gate — the honest reason those two
// modules stay dormant (their coverage remains at the unit level). This is reported as a P7 finding,
// never faked into a green E2E.

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const schemasDir = join( __dirname, '..', '..', 'unit', 'v4', 'fixtures', 'pipeline', 'schemas' )
const selectionsDir = join( __dirname, '..', '..', 'unit', 'v4', 'fixtures', 'pipeline', 'selections' )

const tempDirs = []

afterAll( () => {
    ResourceDatabaseManager.closeAll()
    tempDirs
        .forEach( ( dir ) => {
            if( existsSync( dir ) ) { rmSync( dir, { recursive: true, force: true } ) }
        } )
} )


describe( 'PRD-027 Becomes-live-Set — E2E through Pipeline.load (package v4 surface)', () => {

    describe( 'v4 Pipeline (the production loader)', () => {
        test( 'loads a clean v4 schema end-to-end and returns the full result shape', async () => {
            const filePath = join( schemasDir, 'v4-full-stages.mjs' )
            const result = await Pipeline.load( { filePath, skipScan: true } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'main' ][ 'namespace' ] ).toBe( 'fullstages' )
            expect( result[ 'handlerMap' ] ).toBeDefined()
            expect( result[ 'contentMap' ] ).toBeDefined()
            expect( result ).toHaveProperty( 'prompts' )
            expect( result ).toHaveProperty( 'selections' )
        } )
    } )


    describe( 'SkillContentGenerator (contentMap generation)', () => {
        test( 'Pipeline.load populates a non-empty contentMap from the schema tools', async () => {
            const filePath = join( schemasDir, 'v4-full-stages.mjs' )
            const result = await Pipeline.load( { filePath, skipScan: true } )

            expect( result[ 'contentMap' ] instanceof Map ).toBe( true )
            expect( result[ 'contentMap' ].size ).toBeGreaterThan( 0 )
        } )
    } )


    describe( 'SelectionLoader (selection flow through the loader)', () => {
        test( 'a selection file passed via selectionFiles is loaded and keyed by namespace', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )
            const selectionFile = join( selectionsDir, 'valid-selection.mjs' )
            const result = await Pipeline.load( { filePath, skipScan: true, selectionFiles: [ selectionFile ] } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'selections' ][ 'pipelinetest' ] ).toBeDefined()
            expect( result[ 'selections' ][ 'pipelinetest' ][ 'name' ] ).toBe( 'BasicSelection' )
        } )

        test( 'an invalid selection is rejected by the loader/validator (fail-loud, no silent pass)', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )
            const invalidSelection = join( selectionsDir, 'invalid-selection.mjs' )
            const result = await Pipeline.load( { filePath, skipScan: true, selectionFiles: [ invalidSelection ] } )

            expect( result[ 'status' ] ).toBe( false )
            expect( Array.isArray( result[ 'messages' ] ) ).toBe( true )
            expect( result[ 'messages' ].length ).toBeGreaterThan( 0 )
        } )
    } )


    describe( 'v4 ResourceDatabaseManager (resource init through Pipeline.load)', () => {
        test( 'a sqlite resource runs the resource stage without throwing (RDM.initialize wired)', async () => {
            const filePath = join( schemasDir, 'v4-with-resources.mjs' )
            const result = await Pipeline.load( { filePath, skipScan: true } )

            // The fixture DB dir does not exist, so RDM surfaces a connect warning rather than
            // throwing — the point is the resource stage ran through RDM without a TypeError and
            // the load still succeeds.
            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'main' ][ 'resources' ][ 'verifiedContracts' ][ 'source' ] ).toBe( 'sqlite' )
        } )
    } )
} )


describe( 'PRD-027 v4 ResourceDatabaseManager — write-time backup path (createBackupIfNeeded)', () => {
    test( 'a file-based write through ResourceExecutor creates a .bak snapshot, no TypeError', async () => {
        const dir = mkdtempSync( join( tmpdir(), 'flowmcp-rdm-e2e-' ) )
        tempDirs.push( dir )
        const dbPath = join( dir, 'contracts.db' )

        // Seed a real sqlite file so createBackupIfNeeded has something to copy.
        const seed = new Database( dbPath )
        seed.exec( 'CREATE TABLE contracts ( address TEXT PRIMARY KEY, name TEXT )' )
        seed.close()

        expect( existsSync( dbPath ) ).toBe( true )
        expect( existsSync( `${dbPath}.bak` ) ).toBe( false )

        const resourceDefinition = {
            source: 'sqlite',
            mode: 'file-based',
            database: dbPath,
            queries: {}
        }

        const { struct } = await ResourceExecutor.execute( {
            resourceDefinition,
            resourceName: 'contracts',
            queryName: 'runSql',
            userParams: { sql: "INSERT INTO contracts ( address, name ) VALUES ( '0xabc', 'demo' )" },
            handlerMap: {},
            schemaRef: 'rdmbackup'
        } )

        expect( struct[ 'status' ] ).toBe( true )
        // The write triggered a one-time backup at <db>.bak.
        expect( existsSync( `${dbPath}.bak` ) ).toBe( true )
    } )
} )


describe( 'PRD-027 dormancy proof — why PrefillExecutor / PlaceholderResolver stay unit-only', () => {
    test( 'Pipeline.load rejects a schema with a top-level main.skills block (VAL016)', async () => {
        // MainValidator forbids main.skills in v4.0.0, so the skills stage never receives skills;
        // PrefillExecutor.execute and PlaceholderResolver.resolve (skill-content branch) are
        // therefore unreachable through the validating production loader. This is the honest gate.
        const filePath = join( schemasDir, 'v4-with-skills.mjs' )
        const result = await Pipeline.load( { filePath, skipScan: true } )

        expect( result[ 'status' ] ).toBe( false )
        const joined = ( result[ 'messages' ] || [] ).join( ' ' )
        expect( joined ).toContain( 'VAL016' )
        expect( joined ).toContain( 'main.skills' )
    } )

    test( 'a clean load leaves skills empty and prefillResults empty (the dormancy is observable)', async () => {
        const filePath = join( schemasDir, 'v4-with-prefill.mjs' )
        const result = await Pipeline.load( {
            filePath,
            skipScan: true,
            fetchFn: async () => ( { data: 'x' } ),
            prefillTimeout: 1000,
            userParams: { name: 'a' }
        } )

        expect( result[ 'status' ] ).toBe( true )
        expect( Object.keys( result[ 'skills' ] || {} ) ).toEqual( [] )
        expect( result[ 'prefillResults' ] instanceof Map ).toBe( true )
        expect( result[ 'prefillResults' ].size ).toBe( 0 )
    } )
} )
