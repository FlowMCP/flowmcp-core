import { describe, test, expect } from '@jest/globals'
import { SchemaLoader } from '../../src/v2/task/SchemaLoader.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures', 'schemas' )


describe( 'SchemaLoader v3 — routes/tools alias', () => {
    describe( 'v3 native (tools key)', () => {
        test( 'loads schema with tools key and detects v3', async () => {
            const filePath = join( fixturesDir, 'valid-v3-tools.mjs' )
            const { main, messages, detectedVersion } = await SchemaLoader
                .load( { filePath } )

            expect( main ).not.toBeNull()
            expect( main[ 'tools' ] ).toBeDefined()
            expect( main[ 'namespace' ] ).toBe( 'testtools' )
            expect( detectedVersion ).toBe( 'v3' )
            expect( messages ).toEqual( [] )
        } )
    } )


    describe( 'v2 backward compat (routes key)', () => {
        test( 'loads schema with routes key, aliases to tools, and detects v2', async () => {
            const filePath = join( fixturesDir, 'valid-minimal.mjs' )
            const { main, messages, detectedVersion } = await SchemaLoader
                .load( { filePath } )

            expect( main ).not.toBeNull()
            expect( main[ 'tools' ] ).toBeDefined()
            expect( main[ 'tools' ][ 'getStatus' ] ).toBeDefined()
            expect( detectedVersion ).toBe( 'v2' )

            const hasDeprecationWarning = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Deprecated' ) && msg.includes( 'routes' )

                    return match
                } )

            expect( hasDeprecationWarning ).toBe( true )
        } )
    } )


    describe( 'ambiguous (both tools and routes)', () => {
        test( 'returns error when schema has both tools and routes', async () => {
            const filePath = join( fixturesDir, 'valid-v3-tools-and-routes.mjs' )
            const { messages } = await SchemaLoader
                .load( { filePath } )

            const hasAmbiguousError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'ambiguous' ) && msg.includes( 'tools' ) && msg.includes( 'routes' )

                    return match
                } )

            expect( hasAmbiguousError ).toBe( true )
        } )
    } )


    describe( 'legacy v1 schema (no tools, no routes on main)', () => {
        test( 'returns unknown version for legacy schema without main', async () => {
            const filePath = join( fixturesDir, 'legacy-v120.mjs' )
            const { main, detectedVersion, messages } = await SchemaLoader
                .load( { filePath } )

            expect( main ).toBeNull()
            expect( detectedVersion ).toBe( 'unknown' )
            expect( messages ).toEqual( [] )
        } )
    } )
} )
