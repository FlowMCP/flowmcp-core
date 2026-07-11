import { describe, test, expect } from '@jest/globals'
import { LibraryLoader } from '../../../src/v4/task/LibraryLoader.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fallbackBase = join( __dirname, 'fixtures', 'loader-fallback' )
const bindingBase = join( __dirname, 'fixtures', 'loader-binding' )


describe( 'LibraryLoader', () => {
    describe( 'load()', () => {
        test( 'returns empty object when no libraries required', async () => {
            const { libraries } = await LibraryLoader
                .load( { requiredLibraries: [], allowlist: null } )

            expect( libraries ).toEqual( {} )
        } )


        test( 'returns empty object when requiredLibraries is null', async () => {
            const { libraries } = await LibraryLoader
                .load( { requiredLibraries: null, allowlist: null } )

            expect( libraries ).toEqual( {} )
        } )


        test( 'loads an allowed library', async () => {
            const { libraries } = await LibraryLoader
                .load( { requiredLibraries: [ 'zod' ], allowlist: [ 'zod' ] } )

            expect( libraries['zod'] ).toBeDefined()
        } )


        test( 'throws SEC020 for unapproved library', async () => {
            await expect(
                LibraryLoader.load( {
                    requiredLibraries: [ 'dangerous-pkg' ],
                    allowlist: [ 'safe-pkg' ]
                } )
            ).rejects.toThrow( 'SEC020' )
        } )


        test( 'throws SEC020 for library not in default allowlist', async () => {
            await expect(
                LibraryLoader.load( {
                    requiredLibraries: [ 'unknown-lib' ],
                    allowlist: null
                } )
            ).rejects.toThrow( 'SEC020' )
        } )


        test( 'reports all unapproved libraries at once', async () => {
            try {
                await LibraryLoader.load( {
                    requiredLibraries: [ 'bad1', 'bad2' ],
                    allowlist: [ 'good' ]
                } )
                expect( true ).toBe( false )
            } catch( err ) {
                expect( err.message ).toContain( 'bad1' )
                expect( err.message ).toContain( 'bad2' )
            }
        } )


        test( 'falls back to createRequire when ESM import fails (native/CJS path)', async () => {
            // 'fallbackcjs' is a CJS-only fixture under fallbackBase/node_modules. A bare
            // `import('fallbackcjs')` cannot resolve from core/src, so the loader must use
            // createRequire( resolveBase ) — the same mechanism that loads native .node
            // bindings like talib through the Core pipeline path (Memo 063, F4).
            const { libraries } = await LibraryLoader.load( {
                requiredLibraries: [ 'fallbackcjs' ],
                allowlist: [ 'fallbackcjs' ],
                resolveBase: fallbackBase
            } )

            expect( libraries[ 'fallbackcjs' ] ).toBeDefined()
            expect( libraries[ 'fallbackcjs' ].marker )
                .toBe( 'loaded-via-createRequire-fallback' )
        } )


        test( 'allowlist check stays in front of the createRequire fallback (fail-closed)', async () => {
            await expect(
                LibraryLoader.load( {
                    requiredLibraries: [ 'fallbackcjs' ],
                    resolveBase: fallbackBase
                } )
            ).rejects.toThrow( 'SEC020' )
        } )
    } )


    // Memo 152 / PRD-018 (D-06) — external requiredLibraries resolution ported from the CLI
    // (#resolveHandlers / #loadOneLibrary, Memo 119/150). These pin the codes, the exact message
    // texts, the base ordering and the LIB-002 emit that the 6 CLI suites depend on byte-for-byte.
    describe( 'resolveExternal() — Memo 150 external library gate (F17=A)', () => {
        test( 'returns {} when no libraries are required', async () => {
            const { libraries } = await LibraryLoader
                .resolveExternal( { requiredLibraries: [], resolveBases: [ fallbackBase ] } )

            expect( libraries ).toEqual( {} )
        } )


        test( 'returns {} when requiredLibraries is null', async () => {
            const { libraries } = await LibraryLoader
                .resolveExternal( { requiredLibraries: null, resolveBases: [ fallbackBase ] } )

            expect( libraries ).toEqual( {} )
        } )


        test( 'applies NO name-allowlist — resolves any lib present in a base (Memo 150 F7)', async () => {
            // 'fallbackcjs' is NOT on the core #defaultAllowlist; resolveExternal still loads it
            // because the gate is folder presence, owned by the CLI — not a name-allowlist.
            const { libraries } = await LibraryLoader.resolveExternal( {
                requiredLibraries: [ 'fallbackcjs' ],
                resolveBases: [ fallbackBase ]
            } )

            expect( libraries[ 'fallbackcjs' ] ).toBeDefined()
            expect( libraries[ 'fallbackcjs' ].marker ).toBe( 'loaded-via-createRequire-fallback' )
        } )


        test( 'resolves a library found only in base 3 of 3 (ordered chain)', async () => {
            const { libraries } = await LibraryLoader.resolveExternal( {
                requiredLibraries: [ 'fallbackcjs' ],
                resolveBases: [ '/no/such/base-one', '/no/such/base-two', fallbackBase ]
            } )

            expect( libraries[ 'fallbackcjs' ].marker ).toBe( 'loaded-via-createRequire-fallback' )
        } )


        test( 'emits LIB-002 for each base that cannot resolve the lib', async () => {
            const emitted = []
            const emit = ( event ) => { emitted.push( event ) }

            await LibraryLoader.resolveExternal( {
                requiredLibraries: [ 'fallbackcjs' ],
                resolveBases: [ '/no/such/base-one', '/no/such/base-two', fallbackBase ],
                emit
            } )

            const lib002 = emitted.filter( ( e ) => e[ 'code' ] === 'LIB-002' )
            expect( lib002.length ).toBe( 2 )
            expect( lib002[ 0 ][ 'location' ] ).toBe( 'loadOneLibrary: require base could not resolve lib' )
        } )


        test( 'throws coded LIB-001 with the exact npm install --prefix command when nowhere resolvable', async () => {
            const hint = '/tmp/allowed-libs-core-test'

            await expect(
                LibraryLoader.resolveExternal( {
                    requiredLibraries: [ 'flowmcp-nowhere-lib' ],
                    resolveBases: [ '/no/such/base-one', '/no/such/base-two' ],
                    installHintBase: hint
                } )
            ).rejects.toThrow( /LIB-001[\s\S]*npm install --prefix/ )
        } )


        test( 'LIB-001 message names the lib, the singular wording and the hint base', async () => {
            const hint = '/tmp/allowed-libs-core-test'
            let message = ''

            try {
                await LibraryLoader.resolveExternal( {
                    requiredLibraries: [ 'flowmcp-nowhere-lib' ],
                    resolveBases: [ '/no/such/base' ],
                    installHintBase: hint
                } )
            } catch( err ) {
                message = err.message
            }

            expect( message ).toContain( 'LIB-001 required library not resolvable' )
            expect( message ).toContain( `allowed-libraries (${hint})` )
            expect( message ).toContain( 'CLI base, nor schema dir' )
            expect( message ).toContain( `npm install --prefix ${hint} flowmcp-nowhere-lib` )
        } )


        test( 'LIB-001 uses plural wording for multiple missing libraries', async () => {
            let message = ''

            try {
                await LibraryLoader.resolveExternal( {
                    requiredLibraries: [ 'flowmcp-nowhere-a', 'flowmcp-nowhere-b' ],
                    resolveBases: [ '/no/such/base' ],
                    installHintBase: '/tmp/al'
                } )
            } catch( err ) {
                message = err.message
            }

            expect( message ).toContain( 'LIB-001 required libraries not resolvable' )
            expect( message ).toContain( 'flowmcp-nowhere-a, flowmcp-nowhere-b' )
            expect( message ).toContain( 'flowmcp-nowhere-a flowmcp-nowhere-b' )
        } )


        test( 'distinguishes installed-but-unloadable (LIB-BINDING) from not-installed (LIB-001)', async () => {
            let message = ''

            try {
                await LibraryLoader.resolveExternal( {
                    requiredLibraries: [ 'broken-native-core-test' ],
                    resolveBases: [ bindingBase ],
                    installHintBase: '/tmp/al'
                } )
            } catch( err ) {
                message = err.message
            }

            expect( message ).toContain( 'LIB-BINDING' )
            expect( message ).toContain( 'broken-native-core-test' )
            expect( message ).toContain( 'Rebuild the native module' )
            expect( message ).toContain( 'This is NOT a missing dependency.' )
            expect( message ).not.toContain( 'LIB-001' )
            expect( message ).not.toContain( 'LIB-RESOLVE' )
        } )


        test( 'LIB-BINDING is deliberately uncoded (does not match the PREFIX-NNN code shape)', async () => {
            let message = ''

            try {
                await LibraryLoader.resolveExternal( {
                    requiredLibraries: [ 'broken-native-core-test' ],
                    resolveBases: [ bindingBase ]
                } )
            } catch( err ) {
                message = err.message
            }

            // The CLI catch routes coded (/^[A-Z]{3,4}-\d{3}/) errors to re-throw and uncoded to
            // log+degrade. LIB-BINDING must NOT match, so a broken binding degrades (needs rebuild).
            expect( /^[A-Z]{3,4}-\d{3}/.test( message ) ).toBe( false )
        } )


        test( 'LIB-BINDING wins over LIB-001 when both a broken and a missing lib are declared', async () => {
            let message = ''

            try {
                await LibraryLoader.resolveExternal( {
                    requiredLibraries: [ 'flowmcp-nowhere-lib', 'broken-native-core-test' ],
                    resolveBases: [ bindingBase ],
                    installHintBase: '/tmp/al'
                } )
            } catch( err ) {
                message = err.message
            }

            expect( message ).toContain( 'LIB-BINDING' )
            expect( message ).not.toContain( 'LIB-001' )
        } )
    } )


    describe( 'getDefaultAllowlist()', () => {
        test( 'returns the default allowlist with built-ins and external libraries', () => {
            const { allowlist } = LibraryLoader.getDefaultAllowlist()

            expect( Array.isArray( allowlist ) ).toBe( true )
            expect( allowlist.length ).toBe( 22 )

            // Node.js Built-ins
            expect( allowlist ).toContain( 'zlib' )
            expect( allowlist ).toContain( 'crypto' )
            expect( allowlist ).toContain( 'buffer' )
            expect( allowlist ).toContain( 'path' )
            expect( allowlist ).toContain( 'url' )
            expect( allowlist ).toContain( 'util' )
            expect( allowlist ).toContain( 'stream' )
            expect( allowlist ).toContain( 'querystring' )

            // Blockchain / Web3
            expect( allowlist ).toContain( 'ethers' )

            // Trading / Finance
            expect( allowlist ).toContain( 'ccxt' )
            expect( allowlist ).toContain( 'indicatorts' )
            expect( allowlist ).toContain( 'yahoo-finance2' )
            expect( allowlist ).toContain( 'trading-signals' )
            expect( allowlist ).toContain( 'talib' )
            expect( allowlist ).toContain( 'technicalindicators' )
            expect( allowlist ).toContain( 'moment' )

            // Visualization
            expect( allowlist ).toContain( 'vega-lite' )
            expect( allowlist ).toContain( 'vega' )
            expect( allowlist ).toContain( 'canvas' )

            // Storage / IPFS
            expect( allowlist ).toContain( 'pinata' )
            expect( allowlist ).toContain( 'irys' )

            // Database
            expect( allowlist ).toContain( 'better-sqlite3' )

            // Still NOT allowed
            expect( allowlist ).not.toContain( 'axios' )
            expect( allowlist ).not.toContain( 'lodash' )
        } )


        test( 'returns a copy, not the original', () => {
            const { allowlist: first } = LibraryLoader.getDefaultAllowlist()
            const { allowlist: second } = LibraryLoader.getDefaultAllowlist()
            first.push( 'hacked' )

            expect( second ).not.toContain( 'hacked' )
        } )
    } )


    describe( 'mergeAllowlist()', () => {
        test( 'returns default allowlist when extraAllowlist is missing', () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( {} )

            expect( Array.isArray( allowlist ) ).toBe( true )
            expect( allowlist.length ).toBe( 22 )
            expect( allowlist ).toContain( 'trading-signals' )
        } )


        test( 'returns default allowlist when extraAllowlist is null', () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( { extraAllowlist: null } )

            expect( allowlist.length ).toBe( 22 )
        } )


        test( 'returns default allowlist when extraAllowlist is undefined', () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( { extraAllowlist: undefined } )

            expect( allowlist.length ).toBe( 22 )
        } )


        test( 'returns default allowlist when extraAllowlist is empty array', () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( { extraAllowlist: [] } )

            expect( allowlist.length ).toBe( 22 )
        } )


        test( 'merges extra entries into default allowlist', () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( {
                extraAllowlist: [ 'my-custom', 'another-lib' ]
            } )

            expect( allowlist.length ).toBe( 24 )
            expect( allowlist ).toContain( 'my-custom' )
            expect( allowlist ).toContain( 'another-lib' )
            expect( allowlist ).toContain( 'trading-signals' )
        } )


        test( 'deduplicates entries when extra overlaps with default', () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( {
                extraAllowlist: [ 'moment', 'unique-extra' ]
            } )

            expect( allowlist.length ).toBe( 23 )
            expect( allowlist.filter( ( lib ) => lib === 'moment' ).length ).toBe( 1 )
            expect( allowlist ).toContain( 'unique-extra' )
        } )


        test( 'deduplicates duplicates within extra array', () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( {
                extraAllowlist: [ 'dup', 'dup', 'other' ]
            } )

            expect( allowlist.length ).toBe( 24 )
            expect( allowlist.filter( ( lib ) => lib === 'dup' ).length ).toBe( 1 )
        } )


        test( 'allows merged extra library to be loaded via load()', async () => {
            const { allowlist } = LibraryLoader.mergeAllowlist( {
                extraAllowlist: [ 'zod' ]
            } )

            const { libraries } = await LibraryLoader
                .load( { requiredLibraries: [ 'zod' ], allowlist } )

            expect( libraries['zod'] ).toBeDefined()
        } )
    } )
} )
