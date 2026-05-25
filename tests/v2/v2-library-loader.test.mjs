import { describe, test, expect } from '@jest/globals'
import { LibraryLoader } from '../../src/v2/task/LibraryLoader.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fallbackBase = join( __dirname, 'fixtures', 'loader-fallback' )


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
            ).rejects.toThrow( 'SEC013' )
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
