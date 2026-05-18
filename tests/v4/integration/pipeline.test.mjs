import { describe, test, expect } from '@jest/globals'
import { MainValidator, MetaGenerator } from '../../../src/v4/index.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )

const schemasBase = join( __dirname, '..', '..', '..', '..', 'flowmcp-schemas-private', 'schemas', 'v4.0.0', 'providers' )

const hasSiblingSchemas = existsSync( schemasBase )
const describeWithSchemas = hasSiblingSchemas ? describe : describe.skip


async function loadAndEnrich( { filePath } ) {
    const mod = await import( pathToFileURL( filePath ).href )
    const main = mod[ 'main' ]
    const handlersFn = mod[ 'handlers' ] || null
    const toolsObj = main && main[ 'tools' ] ? main[ 'tools' ] : {}
    const enrichedTools = Object.fromEntries(
        Object.entries( toolsObj )
            .map( ( [ name, tool ] ) => {
                if( tool && tool[ 'meta' ] ) { return [ name, tool ] }
                const { meta } = MetaGenerator.generate( { tool, 'toolName': name } )
                return [ name, { ...tool, meta } ]
            } )
    )
    return {
        'main': { ...main, 'tools': enrichedTools },
        'handlersFn': handlersFn
    }
}


describe( 'v4 Pipeline integration with real schemas', () => {

    describeWithSchemas( 'simple schema (no handlers)', () => {
        test( 'loads coincap/assets.mjs and validates as v4', async () => {
            const filePath = join( schemasBase, 'coincap', 'assets.mjs' )
            const { main, handlersFn } = await loadAndEnrich( { filePath } )

            expect( main[ 'namespace' ] ).toBe( 'coincap' )
            expect( main[ 'version' ] ).toBe( '4.0.0' )

            const toolNames = Object.keys( main[ 'tools' ] )
            expect( toolNames ).toContain( 'listAssets' )
            expect( toolNames ).toContain( 'singleAsset' )
            expect( toolNames ).toContain( 'assetMarkets' )
            expect( toolNames ).toContain( 'assetHistory' )

            const validation = MainValidator.validate( { main } )
            expect( validation[ 'status' ] ).toBe( true )

            expect( handlersFn ).toBeNull()
        } )
    } )


    describeWithSchemas( 'handlers-clean schema (postRequest only)', () => {
        test( 'loads solscan/getChainInfo.mjs with postRequest handler', async () => {
            const filePath = join( schemasBase, 'solscan', 'getChainInfo.mjs' )
            const { main, handlersFn } = await loadAndEnrich( { filePath } )

            expect( main[ 'namespace' ] ).toBe( 'solscan' )
            expect( main[ 'version' ] ).toBe( '4.0.0' )
            expect( main[ 'requiredServerParams' ] ).toContain( 'SOLSCAN_API_KEY' )

            const validation = MainValidator.validate( { main } )
            expect( validation[ 'status' ] ).toBe( true )

            expect( typeof handlersFn ).toBe( 'function' )
        } )


        test( 'loads alternative/fearAndGreed.mjs with multiple tools', async () => {
            const filePath = join( schemasBase, 'alternative', 'fearAndGreed.mjs' )
            const { main } = await loadAndEnrich( { filePath } )

            expect( main[ 'namespace' ] ).toBe( 'alternative' )

            const toolNames = Object.keys( main[ 'tools' ] )
            expect( toolNames ).toContain( 'getCurrentFng' )
            expect( toolNames ).toContain( 'getHistoricalFng' )
            expect( toolNames ).toContain( 'analyzeFngTrend' )

            const validation = MainValidator.validate( { main } )
            expect( validation[ 'status' ] ).toBe( true )
        } )
    } )


    describeWithSchemas( 'shared-lists schema (evmChains)', () => {
        test( 'loads moralis/priceApi.mjs and exposes evmChains shared-list ref', async () => {
            const filePath = join( schemasBase, 'moralis', 'priceApi.mjs' )
            const { main, handlersFn } = await loadAndEnrich( { filePath } )

            expect( main[ 'namespace' ] ).toBe( 'moralis' )
            expect( main[ 'version' ] ).toBe( '4.0.0' )

            const sharedLists = main[ 'sharedLists' ] || []
            expect( Array.isArray( sharedLists ) ).toBe( true )
            const hasEvmChains = sharedLists
                .some( ( ref ) => ref && ( ref[ 'ref' ] === 'evmChains' || ref[ 'name' ] === 'evmChains' ) )
            expect( hasEvmChains ).toBe( true )

            const validation = MainValidator.validate( { main } )
            expect( validation[ 'status' ] ).toBe( true )

            expect( typeof handlersFn ).toBe( 'function' )
        } )
    } )


    describeWithSchemas( 'executeRequest schema', () => {
        test( 'loads chainlist/chainlist.mjs with executeRequest handlers', async () => {
            const filePath = join( schemasBase, 'chainlist', 'chainlist.mjs' )
            const { main, handlersFn } = await loadAndEnrich( { filePath } )

            expect( main[ 'namespace' ] ).toBe( 'chainlist' )

            const toolNames = Object.keys( main[ 'tools' ] )
            expect( toolNames.length ).toBeGreaterThan( 0 )

            const validation = MainValidator.validate( { main } )
            expect( validation[ 'status' ] ).toBe( true )

            expect( typeof handlersFn ).toBe( 'function' )
        } )
    } )


    describeWithSchemas( 'main validator validates real v4 schemas', () => {
        test( 'validates that solscan/getChainInfo.mjs main block has all required fields', async () => {
            const filePath = join( schemasBase, 'solscan', 'getChainInfo.mjs' )
            const { main } = await loadAndEnrich( { filePath } )

            expect( typeof main[ 'namespace' ] ).toBe( 'string' )
            expect( typeof main[ 'name' ] ).toBe( 'string' )
            expect( typeof main[ 'description' ] ).toBe( 'string' )
            expect( typeof main[ 'version' ] ).toBe( 'string' )
            expect( typeof main[ 'root' ] ).toBe( 'string' )
            expect( typeof main[ 'tools' ] ).toBe( 'object' )

            expect( main[ 'version' ] ).toMatch( /^4\.\d+\.\d+$/ )
            expect( main[ 'root' ].startsWith( 'https://' ) ).toBe( true )
        } )
    } )


    describeWithSchemas( 'pipeline return shape consistency', () => {
        test( 'all successful loads return same shape (main + tools + meta)', async () => {
            const schemaPaths = [
                join( schemasBase, 'coincap', 'assets.mjs' ),
                join( schemasBase, 'solscan', 'getChainInfo.mjs' ),
                join( schemasBase, 'alternative', 'fearAndGreed.mjs' ),
                join( schemasBase, 'chainlist', 'chainlist.mjs' )
            ]

            const loadPromises = schemaPaths
                .map( async ( filePath ) => {
                    const result = await loadAndEnrich( { filePath } )
                    return result
                } )

            const results = await Promise.all( loadPromises )

            results
                .forEach( ( { main } ) => {
                    expect( typeof main[ 'namespace' ] ).toBe( 'string' )
                    expect( main[ 'version' ] ).toMatch( /^4\.\d+\.\d+$/ )
                    expect( typeof main[ 'tools' ] ).toBe( 'object' )

                    Object.values( main[ 'tools' ] )
                        .forEach( ( tool ) => {
                            expect( tool[ 'meta' ] ).toBeDefined()
                            expect( typeof tool[ 'meta' ][ 'isReadOnly' ] ).toBe( 'boolean' )
                        } )

                    const validation = MainValidator.validate( { main } )
                    expect( validation[ 'status' ] ).toBe( true )
                } )
        } )
    } )
} )
