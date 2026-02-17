import { describe, test, expect } from '@jest/globals'
import { Pipeline } from '../../src/v2/task/Pipeline.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const schemasDir = join( __dirname, 'fixtures', 'schemas' )
const listsDir = join( __dirname, 'fixtures', 'lists' )


describe( 'Pipeline', () => {
    describe( 'load()', () => {
        test( 'loads a valid minimal schema', async () => {
            const filePath = join( schemasDir, 'valid-minimal.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'testminimal' )
            expect( result['handlerMap']['getStatus'] ).toBeDefined()
            expect( result['handlerMap']['getStatus']['preRequest'] ).toBeNull()
            expect( result['handlerMap']['getStatus']['postRequest'] ).toBeNull()
        } )


        test( 'loads a schema with handlers', async () => {
            const filePath = join( schemasDir, 'valid-with-handlers.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['main']['namespace'] ).toBe( 'testhandlers' )
            expect( typeof result['handlerMap']['getUser']['postRequest'] ).toBe( 'function' )
        } )


        test( 'loads a schema with shared lists', async () => {
            const filePath = join( schemasDir, 'valid-shared-list.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['sharedLists']['evmChains'] ).toBeDefined()
            expect( result['sharedLists']['evmChains'].length ).toBe( 2 )

            result['sharedLists']['evmChains']
                .forEach( ( entry ) => {
                    expect( entry['mainnet'] ).toBe( true )
                } )
        } )


        test( 'rejects a schema with import statement', async () => {
            const filePath = join( schemasDir, 'invalid-has-import.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( false )

            const hasSecError = result['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'SEC001' )

                    return match
                } )

            expect( hasSecError ).toBe( true )
        } )


        test( 'rejects a schema with eval', async () => {
            const filePath = join( schemasDir, 'invalid-has-eval.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( false )

            const hasSecError = result['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'SEC003' )

                    return match
                } )

            expect( hasSecError ).toBe( true )
        } )


        test( 'rejects a schema with process access', async () => {
            const filePath = join( schemasDir, 'invalid-has-process.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( false )

            const hasSecError = result['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'SEC006' )

                    return match
                } )

            expect( hasSecError ).toBe( true )
        } )


        test( 'loads a legacy v1.2.0 schema with warnings', async () => {
            const filePath = join( schemasDir, 'legacy-v120.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['main']['namespace'] ).toBe( 'testlegacy' )
            expect( result['main']['version'] ).toBe( '2.0.0' )
            expect( result['warnings'].length ).toBeGreaterThan( 0 )

            const hasLegacyWarning = result['warnings']
                .some( ( w ) => {
                    const match = w.includes( 'v1.x' )

                    return match
                } )

            expect( hasLegacyWarning ).toBe( true )
        } )


        test( 'shared lists are deep-frozen in pipeline output', async () => {
            const filePath = join( schemasDir, 'valid-shared-list.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( Object.isFrozen( result['sharedLists'] ) ).toBe( true )
        } )
    } )
} )
