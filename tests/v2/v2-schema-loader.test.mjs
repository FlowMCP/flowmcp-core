import { describe, test, expect } from '@jest/globals'
import { SchemaLoader } from '../../src/v2/task/SchemaLoader.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures', 'schemas' )


describe( 'SchemaLoader', () => {
    describe( 'load()', () => {
        test( 'loads a minimal schema with main export only', async () => {
            const filePath = join( fixturesDir, 'valid-minimal.mjs' )
            const { main, handlersFn, hasHandlers } = await SchemaLoader
                .load( { filePath } )

            expect( main ).not.toBeNull()
            expect( main['namespace'] ).toBe( 'testminimal' )
            expect( main['version'] ).toBe( '2.0.0' )
            expect( handlersFn ).toBeNull()
            expect( hasHandlers ).toBe( false )
        } )


        test( 'loads a schema with both main and handlers exports', async () => {
            const filePath = join( fixturesDir, 'valid-with-handlers.mjs' )
            const { main, handlersFn, hasHandlers } = await SchemaLoader
                .load( { filePath } )

            expect( main ).not.toBeNull()
            expect( main['namespace'] ).toBe( 'testhandlers' )
            expect( handlersFn ).not.toBeNull()
            expect( typeof handlersFn ).toBe( 'function' )
            expect( hasHandlers ).toBe( true )
        } )


        test( 'loads a legacy v1.2.0 schema with schema export', async () => {
            const filePath = join( fixturesDir, 'legacy-v120.mjs' )
            const { main, schema, handlersFn, hasHandlers } = await SchemaLoader
                .load( { filePath } )

            expect( main ).toBeNull()
            expect( schema ).not.toBeNull()
            expect( schema['flowMCP'] ).toBe( '1.2.0' )
            expect( hasHandlers ).toBe( false )
        } )


        test( 'returns full module object for inspection', async () => {
            const filePath = join( fixturesDir, 'valid-with-handlers.mjs' )
            const { module } = await SchemaLoader
                .load( { filePath } )

            expect( module ).toBeDefined()
            expect( module['main'] ).toBeDefined()
            expect( module['handlers'] ).toBeDefined()
        } )
    } )
} )
