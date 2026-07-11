import { describe, test, expect, afterEach, jest } from '@jest/globals'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pipeline } from '../../../src/v4/task/Pipeline.mjs'
import { SchemaLoader } from '../../../src/v4/task/SchemaLoader.mjs'
import { SecurityScanner } from '../../../src/v4/task/SecurityScanner.mjs'
import { SkillContentGenerator } from '../../../src/v4/task/SkillContentGenerator.mjs'
import { PrefillExecutor } from '../../../src/v4/task/PrefillExecutor.mjs'
import { ResourceDatabaseManager } from '../../../src/v4/task/ResourceDatabaseManager.mjs'


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const schemasDir = join( __dirname, 'fixtures', 'pipeline', 'schemas' )
const fallbackBase = join( __dirname, '..', '..', 'v2', 'fixtures', 'loader-fallback' )


describe( 'Pipeline.load options (Memo 152 / PRD-008, B-08)', () => {
    afterEach( () => {
        jest.restoreAllMocks()
    } )


    describe( 'B-08 (a) — stage toggles / Light-Mode', () => {
        test( 'full load calls scan, skill-content and resource stages', async () => {
            const scanSpy = jest.spyOn( SecurityScanner, 'scan' )
            const contentSpy = jest.spyOn( SkillContentGenerator, 'generate' )
            const rdmSpy = jest.spyOn( ResourceDatabaseManager, 'initialize' )
                .mockResolvedValue( { status: true, messages: [] } )

            const filePath = join( schemasDir, 'v4-full-stages.mjs' )
            const result = await Pipeline.load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'status' ] ).toBe( true )
            expect( scanSpy ).toHaveBeenCalled()
            expect( contentSpy ).toHaveBeenCalled()
            expect( rdmSpy ).toHaveBeenCalled()
        } )


        test( 'light load skips scan, skills, prefill and resource stages', async () => {
            const scanSpy = jest.spyOn( SecurityScanner, 'scan' )
            const contentSpy = jest.spyOn( SkillContentGenerator, 'generate' )
            const prefillSpy = jest.spyOn( PrefillExecutor, 'execute' )
            const rdmSpy = jest.spyOn( ResourceDatabaseManager, 'initialize' )
                .mockResolvedValue( { status: true, messages: [] } )

            const filePath = join( schemasDir, 'v4-full-stages.mjs' )
            const result = await Pipeline.load( {
                filePath,
                listsDir: null,
                allowlist: null,
                skipScan: true,
                stages: { skills: false, prefill: false, resources: false, selections: false }
            } )

            expect( result[ 'status' ] ).toBe( true )
            expect( scanSpy ).not.toHaveBeenCalled()
            expect( contentSpy ).not.toHaveBeenCalled()
            expect( prefillSpy ).not.toHaveBeenCalled()
            expect( rdmSpy ).not.toHaveBeenCalled()
        } )
    } )


    describe( 'B-08 (b) — resolveBases[] ordered resolution', () => {
        test( 'resolves a library found only in base 2 of 3', async () => {
            const filePath = join( schemasDir, 'v4-required-library.mjs' )
            const result = await Pipeline.load( {
                filePath,
                listsDir: null,
                allowlist: [ 'fallbackcjs' ],
                resolveBases: [ '/no/such/base-one', fallbackBase, '/no/such/base-three' ]
            } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'libraries' ][ 'fallbackcjs' ][ 'marker' ] )
                .toBe( 'loaded-via-createRequire-fallback' )
        } )


        test( 'throws LIB-001 in strict mode when no base resolves the library', async () => {
            const filePath = join( schemasDir, 'v4-required-library.mjs' )

            await expect(
                Pipeline.load( {
                    filePath,
                    listsDir: null,
                    allowlist: [ 'fallbackcjs' ],
                    resolveBases: [ '/no/such/base-one', '/no/such/base-two' ],
                    strict: true
                } )
            ).rejects.toThrow( 'LIB-001' )
        } )
    } )


    describe( 'B-08 (b) — injected pre-resolved libraries', () => {
        test( 'uses injected libraries without touching LibraryLoader', async () => {
            const filePath = join( schemasDir, 'v4-required-library.mjs' )
            const injected = { fallbackcjs: { marker: 'injected' } }

            const result = await Pipeline.load( {
                filePath,
                listsDir: null,
                allowlist: null,
                libraries: injected
            } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'libraries' ][ 'fallbackcjs' ][ 'marker' ] ).toBe( 'injected' )
        } )
    } )


    describe( 'B-08 (c) — strict fail-loud coded errors', () => {
        test( 'throws LST-001 for a declared sharedLists ref without listsDir', async () => {
            const filePath = join( schemasDir, 'v4-with-shared-lists.mjs' )

            await expect(
                Pipeline.load( { filePath, listsDir: null, allowlist: null, strict: true } )
            ).rejects.toThrow( 'LST-001' )
        } )


        test( 'throws HND-001 for a handler key that matches no route', async () => {
            const filePath = join( schemasDir, 'v4-bad-handler.mjs' )

            await expect(
                Pipeline.load( { filePath, listsDir: null, allowlist: null, strict: true } )
            ).rejects.toThrow( 'HND-001' )
        } )


        test( 'non-strict keeps a PIPE-WARN (no throw) for the missing listsDir', async () => {
            const filePath = join( schemasDir, 'v4-with-shared-lists.mjs' )
            const result = await Pipeline.load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'warnings' ].some( ( w ) => w.includes( 'PIPE-WARN' ) ) ).toBe( true )
        } )
    } )


    describe( 'B-08 (d) — bustCache', () => {
        // NOTE: the end-to-end "changed file is re-read" behaviour is verified against
        // the native Node ESM loader (query-string cache busting). Jest's
        // experimental-vm-modules loader caches dynamic import() by resolved path and
        // ignores the query, so here we verify the wiring (Pipeline forwards bustCache
        // to SchemaLoader.load) plus a load smoke.
        test( 'Pipeline forwards bustCache to SchemaLoader.load', async () => {
            const loadSpy = jest.spyOn( SchemaLoader, 'load' )
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline.load( { filePath, listsDir: null, allowlist: null, bustCache: true } )

            expect( result[ 'status' ] ).toBe( true )
            expect( loadSpy ).toHaveBeenCalledWith( expect.objectContaining( { bustCache: true } ) )
        } )


        test( 'default load does not bust the cache', async () => {
            const loadSpy = jest.spyOn( SchemaLoader, 'load' )
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            await Pipeline.load( { filePath, listsDir: null, allowlist: null } )

            expect( loadSpy ).toHaveBeenCalledWith( expect.objectContaining( { bustCache: false } ) )
        } )
    } )
} )
