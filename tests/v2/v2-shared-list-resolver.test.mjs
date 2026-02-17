import { describe, test, expect } from '@jest/globals'
import { SharedListResolver } from '../../src/v2/task/SharedListResolver.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const listsDir = join( __dirname, 'fixtures', 'lists' )


describe( 'SharedListResolver', () => {
    describe( 'resolve()', () => {
        test( 'returns empty object when no refs provided', async () => {
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: [], listsDir } )

            expect( sharedLists ).toEqual( {} )
        } )


        test( 'returns empty object when refs is null', async () => {
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: null, listsDir } )

            expect( sharedLists ).toEqual( {} )
        } )


        test( 'loads a shared list without filter', async () => {
            const refs = [
                { ref: 'evmChains', version: '1.0.0' }
            ]
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: refs, listsDir } )

            expect( sharedLists['evmChains'] ).toBeDefined()
            expect( sharedLists['evmChains'].length ).toBe( 3 )
        } )


        test( 'applies exists filter', async () => {
            const refs = [
                {
                    ref: 'evmChains',
                    version: '1.0.0',
                    filter: { key: 'etherscanAlias', exists: true }
                }
            ]
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: refs, listsDir } )

            expect( sharedLists['evmChains'].length ).toBe( 2 )

            const hasGoerli = sharedLists['evmChains']
                .some( ( e ) => {
                    const match = e['name'] === 'Goerli'

                    return match
                } )

            expect( hasGoerli ).toBe( false )
        } )


        test( 'applies value filter', async () => {
            const refs = [
                {
                    ref: 'evmChains',
                    version: '1.0.0',
                    filter: { key: 'mainnet', value: true }
                }
            ]
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: refs, listsDir } )

            expect( sharedLists['evmChains'].length ).toBe( 2 )

            sharedLists['evmChains']
                .forEach( ( entry ) => {
                    expect( entry['mainnet'] ).toBe( true )
                } )
        } )


        test( 'applies in filter', async () => {
            const refs = [
                {
                    ref: 'evmChains',
                    version: '1.0.0',
                    filter: { key: 'chainId', in: [ 1, 5 ] }
                }
            ]
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: refs, listsDir } )

            expect( sharedLists['evmChains'].length ).toBe( 2 )

            const chainIds = sharedLists['evmChains']
                .map( ( e ) => {
                    const id = e['chainId']

                    return id
                } )

            expect( chainIds ).toContain( 1 )
            expect( chainIds ).toContain( 5 )
            expect( chainIds ).not.toContain( 137 )
        } )


        test( 'deep-freezes the returned sharedLists', async () => {
            const refs = [
                { ref: 'evmChains', version: '1.0.0' }
            ]
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: refs, listsDir } )

            expect( Object.isFrozen( sharedLists ) ).toBe( true )
            expect( Object.isFrozen( sharedLists['evmChains'] ) ).toBe( true )
            expect( Object.isFrozen( sharedLists['evmChains'][ 0 ] ) ).toBe( true )
        } )


        test( 'mutation of frozen list throws TypeError', async () => {
            const refs = [
                { ref: 'evmChains', version: '1.0.0' }
            ]
            const { sharedLists } = await SharedListResolver
                .resolve( { sharedListRefs: refs, listsDir } )

            expect( () => {
                sharedLists['evmChains'][ 0 ]['name'] = 'Hacked'
            } ).toThrow( TypeError )
        } )


        test( 'throws on version mismatch', async () => {
            const refs = [
                { ref: 'evmChains', version: '2.0.0' }
            ]

            await expect(
                SharedListResolver.resolve( { sharedListRefs: refs, listsDir } )
            ).rejects.toThrow( 'Version mismatch' )
        } )


        test( 'throws on missing list file', async () => {
            const refs = [
                { ref: 'nonExistent', version: '1.0.0' }
            ]

            await expect(
                SharedListResolver.resolve( { sharedListRefs: refs, listsDir } )
            ).rejects.toThrow()
        } )
    } )


    describe( 'interpolateEnum()', () => {
        test( 'replaces enum template with list values', () => {
            const sharedLists = {
                evmChains: [
                    { chainId: 1, name: 'Ethereum' },
                    { chainId: 137, name: 'Polygon' }
                ]
            }
            const template = 'enum({{evmChains:chainId}})'
            const { result } = SharedListResolver
                .interpolateEnum( { template, sharedLists } )

            expect( result ).toBe( 'enum(1,137)' )
        } )


        test( 'leaves unknown list references unchanged', () => {
            const template = 'enum({{unknownList:field}})'
            const { result } = SharedListResolver
                .interpolateEnum( { template, sharedLists: {} } )

            expect( result ).toBe( 'enum({{unknownList:field}})' )
        } )


        test( 'filters null values from interpolation', () => {
            const sharedLists = {
                chains: [
                    { alias: 'api' },
                    { alias: null },
                    { alias: 'api-polygon' }
                ]
            }
            const template = 'enum({{chains:alias}})'
            const { result } = SharedListResolver
                .interpolateEnum( { template, sharedLists } )

            expect( result ).toBe( 'enum(api,api-polygon)' )
        } )
    } )
} )
