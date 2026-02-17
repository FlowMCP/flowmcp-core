import { describe, test, expect } from '@jest/globals'
import { Pipeline } from '../../src/v2/task/Pipeline.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )

const schemasBase = join( __dirname, '..', '..', '..', 'flowmcp-schemas', 'schemas', 'v2.0.0' )
const listsDir = join( schemasBase, '_lists' )
const fixtureSchemas = join( __dirname, 'fixtures', 'schemas' )


describe( 'Pipeline integration with real schemas', () => {
    describe( 'simple schema (no handlers)', () => {
        test( 'loads coincap/assets.mjs without handlers', async () => {
            const filePath = join( schemasBase, 'coincap', 'assets.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'coincap' )
            expect( result['main']['version'] ).toBe( '2.0.0' )

            const routeNames = Object.keys( result['main']['routes'] )
            expect( routeNames.length ).toBe( 4 )
            expect( routeNames ).toContain( 'listAssets' )
            expect( routeNames ).toContain( 'singleAsset' )
            expect( routeNames ).toContain( 'assetMarkets' )
            expect( routeNames ).toContain( 'assetHistory' )

            routeNames
                .forEach( ( name ) => {
                    const handler = result['handlerMap'][ name ]
                    expect( handler ).toBeDefined()
                    expect( handler['preRequest'] ).toBeNull()
                    expect( handler['postRequest'] ).toBeNull()
                    expect( handler['executeRequest'] ).toBeNull()
                } )

            expect( result['sharedLists'] ).toEqual( {} )
            expect( result['libraries'] ).toEqual( {} )
        } )
    } )


    describe( 'handlers-clean schema (postRequest only)', () => {
        test( 'loads solscan-io/getChainInfo.mjs with postRequest handler', async () => {
            const filePath = join( schemasBase, 'solscan-io', 'getChainInfo.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'solscan' )
            expect( result['main']['requiredServerParams'] ).toEqual( [ 'SOLSCAN_API_KEY' ] )

            const { handlerMap } = result
            expect( handlerMap['chainInfo'] ).toBeDefined()
            expect( handlerMap['chainInfo']['preRequest'] ).toBeNull()
            expect( typeof handlerMap['chainInfo']['postRequest'] ).toBe( 'function' )
            expect( handlerMap['chainInfo']['executeRequest'] ).toBeNull()
        } )


        test( 'loads alternative-me/fearAndGreed.mjs with multiple routes', async () => {
            const filePath = join( schemasBase, 'alternative-me', 'fearAndGreed.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['main']['namespace'] ).toBe( 'alternative' )

            const routeNames = Object.keys( result['main']['routes'] )
            expect( routeNames ).toContain( 'getCurrentFng' )
            expect( routeNames ).toContain( 'getHistoricalFng' )
            expect( routeNames ).toContain( 'analyzeFngTrend' )

            routeNames
                .forEach( ( name ) => {
                    const handler = result['handlerMap'][ name ]
                    expect( typeof handler['postRequest'] ).toBe( 'function' )
                } )
        } )
    } )


    describe( 'handlers-imports schema (sharedLists)', () => {
        test( 'loads moralis-com/eth/priceApi.mjs and resolves evmChains', async () => {
            const filePath = join( schemasBase, 'moralis-com', 'eth', 'priceApi.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'moralis' )

            expect( result['main']['sharedLists'] ).toBeDefined()
            expect( result['main']['sharedLists'][ 0 ]['ref'] ).toBe( 'evmChains' )

            expect( result['sharedLists']['evmChains'] ).toBeDefined()
            expect( Array.isArray( result['sharedLists']['evmChains'] ) ).toBe( true )
            expect( result['sharedLists']['evmChains'].length ).toBeGreaterThan( 0 )

            const firstEntry = result['sharedLists']['evmChains'][ 0 ]
            expect( firstEntry['alias'] ).toBeDefined()
            expect( firstEntry['chainId'] ).toBeDefined()
            expect( firstEntry['name'] ).toBeDefined()

            expect( Object.isFrozen( result['sharedLists'] ) ).toBe( true )

            const routeNames = Object.keys( result['main']['routes'] )
            routeNames
                .forEach( ( name ) => {
                    const handler = result['handlerMap'][ name ]
                    expect( handler ).toBeDefined()
                    expect( typeof handler['preRequest'] ).toBe( 'function' )
                } )
        } )
    } )


    describe( 'executeRequest schema', () => {
        test( 'loads chainlist/chainlist.mjs with executeRequest handlers', async () => {
            const filePath = join( schemasBase, 'chainlist', 'chainlist.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'chainlist' )

            const routeNames = Object.keys( result['main']['routes'] )
            expect( routeNames ).toContain( 'getChainById' )
            expect( routeNames ).toContain( 'getChainsByKeyword' )
            expect( routeNames ).toContain( 'getExplorerURLs' )
            expect( routeNames ).toContain( 'getRPCEndpoints' )
            expect( routeNames ).toContain( 'getWebsocketEndpoints' )

            routeNames
                .forEach( ( name ) => {
                    const handler = result['handlerMap'][ name ]
                    expect( handler ).toBeDefined()
                    expect( typeof handler['executeRequest'] ).toBe( 'function' )
                } )
        } )
    } )


    describe( 'security scanner rejects forbidden patterns', () => {
        test( 'rejects fixture schema with import statement', async () => {
            const filePath = join( fixtureSchemas, 'invalid-has-import.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( false )
            expect( result['main'] ).toBeNull()
            expect( result['handlerMap'] ).toEqual( {} )

            const hasSecurityError = result['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'SEC001' )

                    return match
                } )

            expect( hasSecurityError ).toBe( true )
        } )
    } )


    describe( 'main validator validates real schemas', () => {
        test( 'validates that solscan main block has all required fields', async () => {
            const filePath = join( schemasBase, 'solscan-io', 'getChainInfo.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )

            const { main } = result
            expect( typeof main['namespace'] ).toBe( 'string' )
            expect( typeof main['name'] ).toBe( 'string' )
            expect( typeof main['description'] ).toBe( 'string' )
            expect( typeof main['version'] ).toBe( 'string' )
            expect( typeof main['root'] ).toBe( 'string' )
            expect( typeof main['routes'] ).toBe( 'object' )

            expect( main['version'] ).toMatch( /^2\.\d+\.\d+$/ )
            expect( main['root'].startsWith( 'https://' ) ).toBe( true )
        } )
    } )


    describe( 'pipeline return shape consistency', () => {
        test( 'all successful loads return the same shape', async () => {
            const schemaPaths = [
                join( schemasBase, 'coincap', 'assets.mjs' ),
                join( schemasBase, 'solscan-io', 'getChainInfo.mjs' ),
                join( schemasBase, 'alternative-me', 'fearAndGreed.mjs' ),
                join( schemasBase, 'chainlist', 'chainlist.mjs' )
            ]

            const expectedKeys = [ 'status', 'messages', 'main', 'handlerMap', 'sharedLists', 'libraries', 'warnings' ]

            const loadPromises = schemaPaths
                .map( async ( filePath ) => {
                    const result = await Pipeline
                        .load( { filePath, listsDir, allowlist: null } )

                    return result
                } )

            const results = await Promise.all( loadPromises )

            results
                .forEach( ( result ) => {
                    const keys = Object.keys( result )

                    expectedKeys
                        .forEach( ( expectedKey ) => {
                            const found = keys.includes( expectedKey )

                            expect( found ).toBe( true )
                        } )

                    expect( result['status'] ).toBe( true )
                    expect( Array.isArray( result['messages'] ) ).toBe( true )
                    expect( typeof result['main'] ).toBe( 'object' )
                    expect( typeof result['handlerMap'] ).toBe( 'object' )
                    expect( typeof result['sharedLists'] ).toBe( 'object' )
                    expect( typeof result['libraries'] ).toBe( 'object' )
                    expect( Array.isArray( result['warnings'] ) ).toBe( true )
                } )
        } )
    } )
} )
