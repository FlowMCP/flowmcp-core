import { describe, test, expect } from '@jest/globals'
import { LibraryLoader } from '../../src/v2/task/LibraryLoader.mjs'


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


        test( 'throws SEC013 for unapproved library', async () => {
            await expect(
                LibraryLoader.load( {
                    requiredLibraries: [ 'dangerous-pkg' ],
                    allowlist: [ 'safe-pkg' ]
                } )
            ).rejects.toThrow( 'SEC013' )
        } )


        test( 'throws SEC013 for library not in default allowlist', async () => {
            await expect(
                LibraryLoader.load( {
                    requiredLibraries: [ 'unknown-lib' ],
                    allowlist: null
                } )
            ).rejects.toThrow( 'SEC013' )
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
    } )


    describe( 'getDefaultAllowlist()', () => {
        test( 'returns the default allowlist with built-ins and external libraries', () => {
            const { allowlist } = LibraryLoader.getDefaultAllowlist()

            expect( Array.isArray( allowlist ) ).toBe( true )
            expect( allowlist.length ).toBe( 18 )

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
            expect( allowlist ).not.toContain( 'moment' )
        } )


        test( 'returns a copy, not the original', () => {
            const { allowlist: first } = LibraryLoader.getDefaultAllowlist()
            const { allowlist: second } = LibraryLoader.getDefaultAllowlist()
            first.push( 'hacked' )

            expect( second ).not.toContain( 'hacked' )
        } )
    } )
} )
