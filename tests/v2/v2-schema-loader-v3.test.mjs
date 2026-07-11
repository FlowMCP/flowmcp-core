import { describe, test, expect } from '@jest/globals'
import { SchemaLoader } from '../../src/v2/task/SchemaLoader.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures', 'schemas' )


// Memo 152 / PRD-006 (G-03, F10=A): the routes->tools auto-alias is removed.
// SchemaLoader is v4-only — a `routes` key is no longer aliased; MainValidator
// rejects it fail-loud downstream. These formerly-positive alias tests are now
// negative: routes stays untouched, `tools` is the only accepted key.
describe( 'SchemaLoader v4 — no routes alias (Memo 152)', () => {
    describe( 'v4 native (tools key)', () => {
        test( 'loads schema with tools key and detects v4', async () => {
            const filePath = join( fixturesDir, 'valid-v3-tools.mjs' )
            const { main, messages, detectedVersion } = await SchemaLoader
                .load( { filePath } )

            expect( main ).not.toBeNull()
            expect( main[ 'tools' ] ).toBeDefined()
            expect( main[ 'namespace' ] ).toBe( 'testtools' )
            expect( detectedVersion ).toBe( 'v4' )
            expect( messages ).toEqual( [] )
        } )
    } )


    describe( 'routes key is NOT aliased', () => {
        test( 'loads schema with routes key without aliasing to tools', async () => {
            const filePath = join( fixturesDir, 'valid-minimal.mjs' )
            const { main, messages, detectedVersion } = await SchemaLoader
                .load( { filePath } )

            expect( main ).not.toBeNull()
            expect( main[ 'tools' ] ).toBeUndefined()
            expect( detectedVersion ).toBe( 'unknown' )
            expect( messages ).toEqual( [] )
        } )
    } )


    describe( 'both tools and routes', () => {
        test( 'keeps tools, ignores routes, no ambiguity message', async () => {
            const filePath = join( fixturesDir, 'valid-v3-tools-and-routes.mjs' )
            const { main, messages, detectedVersion } = await SchemaLoader
                .load( { filePath } )

            expect( main[ 'tools' ] ).toBeDefined()
            expect( detectedVersion ).toBe( 'v4' )
            expect( messages ).toEqual( [] )
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
