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
        test( 'returns the default allowlist', () => {
            const { allowlist } = LibraryLoader.getDefaultAllowlist()

            expect( Array.isArray( allowlist ) ).toBe( true )
            expect( allowlist ).toContain( 'zlib' )
            expect( allowlist ).toContain( 'crypto' )
            expect( allowlist ).toContain( 'buffer' )
            expect( allowlist ).not.toContain( 'ethers' )
            expect( allowlist ).not.toContain( 'axios' )
            expect( allowlist ).not.toContain( 'moment' )
            expect( allowlist ).not.toContain( 'ccxt' )
        } )


        test( 'returns a copy, not the original', () => {
            const { allowlist: first } = LibraryLoader.getDefaultAllowlist()
            const { allowlist: second } = LibraryLoader.getDefaultAllowlist()
            first.push( 'hacked' )

            expect( second ).not.toContain( 'hacked' )
        } )
    } )
} )
