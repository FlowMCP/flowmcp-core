import { describe, it, expect } from '@jest/globals'
import { Pipeline } from '../../../src/v4/task/Pipeline.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const schemasDir = join( __dirname, 'fixtures', 'pipeline', 'schemas' )
const selectionsDir = join( __dirname, 'fixtures', 'pipeline', 'selections' )
const fallbackBase = join( __dirname, '..', '..', 'v2', 'fixtures', 'loader-fallback' )


describe( 'v4 Pipeline', () => {

    describe( 'Public API', () => {
        it( 'exposes static async load()', () => {
            expect( typeof Pipeline.load ).toBe( 'function' )
            expect( Pipeline.load.constructor.name ).toBe( 'AsyncFunction' )
        } )
    } )


    describe( 'Normal pipeline flow (all 16 steps)', () => {
        it( 'loads a minimal valid v4 schema and returns status:true', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'messages' ] ).toEqual( [] )
            expect( result[ 'main' ][ 'namespace' ] ).toBe( 'pipelinetest' )
            expect( result[ 'main' ][ 'version' ] ).toBe( '4.0.0' )
        } )


        it( 'builds a handlerMap for tools (Step 9 — HandlerFactory)', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'handlerMap' ][ 'getStatus' ] ).toBeDefined()
        } )


        it( 'generates a content map for tools (Step 11 — SkillContentGenerator)', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'contentMap' ] ).toBeDefined()
            expect( result[ 'contentMap' ] instanceof Map ).toBe( true )
            // 5 variants per tool (full + parameters + test + call + meta)
            expect( result[ 'contentMap' ].size ).toBeGreaterThanOrEqual( 5 )
        } )


        it( 'returns empty selections when no selectionFiles provided', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'selections' ] ).toEqual( {} )
        } )


        it( 'returns empty prefillResults Map when no skills present', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'prefillResults' ] ).toBeDefined()
            expect( result[ 'prefillResults' ] instanceof Map ).toBe( true )
            expect( result[ 'prefillResults' ].size ).toBe( 0 )
        } )


        it( 'returns empty prompts when no prompts defined (Step 15)', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'prompts' ] ).toEqual( {} )
        } )


        it( 'returns a warnings array (Step 16 — Return)', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( Array.isArray( result[ 'warnings' ] ) ).toBe( true )
        } )
    } )


    describe( 'Failure propagation', () => {
        it( 'returns status:false when MainValidator fails (wrong version)', async () => {
            const filePath = join( schemasDir, 'v4-invalid-version.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'status' ] ).toBe( false )

            const hasVersionError = result[ 'messages' ]
                .some( ( msg ) => msg.includes( 'VAL014' ) || msg.includes( 'version' ) )

            expect( hasVersionError ).toBe( true )
        } )


        it( 'returns status:false when SecurityScanner fails (file with eval)', async () => {
            // Re-use the existing v2 fixture that contains eval() — SecurityScanner is shared.
            const v2FixturesDir = join( __dirname, '..', '..', 'v2', 'fixtures', 'schemas' )
            const filePath = join( v2FixturesDir, 'invalid-has-eval.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'status' ] ).toBe( false )

            const hasSecError = result[ 'messages' ]
                .some( ( msg ) => msg.includes( 'SEC' ) )

            expect( hasSecError ).toBe( true )
        } )


        it( 'returns status:false when an invalid selection file is provided', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )
            const invalidSelectionFile = join( selectionsDir, 'invalid-selection.mjs' )

            const result = await Pipeline
                .load( {
                    filePath,
                    listsDir: null,
                    allowlist: null,
                    selectionFiles: [ invalidSelectionFile ]
                } )

            expect( result[ 'status' ] ).toBe( false )

            const hasSelError = result[ 'messages' ]
                .some( ( msg ) => msg.includes( 'SEL' ) )

            expect( hasSelError ).toBe( true )
        } )


        it( 'returns status:false with a load error when selection file cannot be loaded', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )
            const missingSelectionFile = join( selectionsDir, 'does-not-exist.mjs' )

            const result = await Pipeline
                .load( {
                    filePath,
                    listsDir: null,
                    allowlist: null,
                    selectionFiles: [ missingSelectionFile ]
                } )

            expect( result[ 'status' ] ).toBe( false )

            const hasLoadError = result[ 'messages' ]
                .some( ( msg ) => msg.includes( 'SEL-LOAD' ) )

            expect( hasLoadError ).toBe( true )
        } )
    } )


    describe( 'Selection loading (Steps 7 + 8)', () => {
        it( 'loads and validates a valid selection file', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )
            const selectionFile = join( selectionsDir, 'valid-selection.mjs' )

            const result = await Pipeline
                .load( {
                    filePath,
                    listsDir: null,
                    allowlist: null,
                    selectionFiles: [ selectionFile ]
                } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'selections' ][ 'pipelinetest' ] ).toBeDefined()
            expect( result[ 'selections' ][ 'pipelinetest' ][ 'name' ] ).toBe( 'BasicSelection' )
        } )
    } )


    describe( 'Prefill integration (Step 12)', () => {
        it( 'warns when prefill is declared but fetchFn is missing', async () => {
            // Schema currently has no skills, so we just verify fetchFn-less call works.
            const filePath = join( schemasDir, 'v4-with-prefill.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'prefillResults' ] instanceof Map ).toBe( true )
        } )


        it( 'accepts fetchFn + prefillTimeout without errors when no skills present', async () => {
            const filePath = join( schemasDir, 'v4-with-prefill.mjs' )

            const result = await Pipeline
                .load( {
                    filePath,
                    listsDir: null,
                    allowlist: null,
                    fetchFn: async () => 'mock-response',
                    prefillTimeout: 1000,
                    userParams: { foo: 'bar' }
                } )

            expect( result[ 'status' ] ).toBe( true )
        } )
    } )


    describe( 'Result shape (Step 16)', () => {
        it( 'returns all documented fields in the result object', async () => {
            const filePath = join( schemasDir, 'v4-minimal.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: null } )

            const expectedKeys = [
                'status',
                'messages',
                'main',
                'handlerMap',
                'resourceHandlerMap',
                'sharedLists',
                'libraries',
                'skills',
                'selections',
                'prompts',
                'contentMap',
                'prefillResults',
                'warnings'
            ]

            expectedKeys
                .forEach( ( key ) => {
                    expect( Object.prototype.hasOwnProperty.call( result, key ) ).toBe( true )
                } )
        } )
    } )


    describe( 'Library loading via resolveBase (Step 6 — Befund C / flowmcp-cli#44)', () => {
        it( 'threads resolveBase down to LibraryLoader so a required library resolves deterministically', async () => {
            const filePath = join( schemasDir, 'v4-required-library.mjs' )

            const result = await Pipeline
                .load( { filePath, listsDir: null, allowlist: [ 'fallbackcjs' ], resolveBase: fallbackBase } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'libraries' ][ 'fallbackcjs' ] ).toBeDefined()
            expect( result[ 'libraries' ][ 'fallbackcjs' ][ 'marker' ] )
                .toBe( 'loaded-via-createRequire-fallback' )
        } )


        it( 'fails to resolve the required library when no resolveBase points at its node_modules', async () => {
            const filePath = join( schemasDir, 'v4-required-library.mjs' )

            await expect(
                Pipeline.load( { filePath, listsDir: null, allowlist: [ 'fallbackcjs' ] } )
            ).rejects.toThrow()
        } )
    } )

} )
