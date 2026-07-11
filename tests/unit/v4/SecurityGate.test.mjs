import { describe, test, expect } from '@jest/globals'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pipeline } from '../../../src/v4/task/Pipeline.mjs'
import { FlowMCP } from '../../../src/v4/index.mjs'


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures', 'security' )
const forbiddenFixture = join( fixturesDir, 'top-level-import-schema.mjs' )
const cleanFixture = join( fixturesDir, 'clean-schema.mjs' )


describe( 'v4 security gate — SecurityScanner + skipScan passthrough (Memo 152 / PRD-007)', () => {
    describe( 'E-01 — SecurityScanner lives in the v4 tree with skipScan', () => {
        test( 'FlowMCP.scanSecurity flags a forbidden top-level import', async () => {
            const { status, messages } = await FlowMCP.scanSecurity( { filePath: forbiddenFixture } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'SEC001' ) ) ).toBe( true )
        } )


        test( 'FlowMCP.scanSecurity passes a clean schema', async () => {
            const { status, messages } = await FlowMCP.scanSecurity( { filePath: cleanFixture } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'FlowMCP.scanSecurity honours skipScan on a forbidden schema', async () => {
            const { status } = await FlowMCP.scanSecurity( { filePath: forbiddenFixture, skipScan: true } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'E-02 — fetch on the v4 surface', () => {
        test( 'FlowMCP.fetch executes a mocked handler and returns a struct', async () => {
            const main = {
                namespace: 'fetchtest',
                root: 'https://api.example.com',
                tools: {
                    getThing: { method: 'GET', path: '/thing', description: 'd', parameters: [] }
                }
            }
            const handlerMap = {
                getThing: {
                    executeRequest: async ( { struct } ) => ( { struct, response: { ok: true } } )
                }
            }

            const struct = await FlowMCP.fetch( {
                main,
                handlerMap,
                userParams: {},
                serverParams: {},
                routeName: 'getThing'
            } )

            expect( struct[ 'status' ] ).toBe( true )
            expect( struct[ 'data' ] ).toEqual( { ok: true } )
        } )
    } )


    describe( 'E-03 — Pipeline.load skipScan passthrough (trusted vs untrusted)', () => {
        test( 'default load (skipScan omitted) rejects a forbidden schema BEFORE import()', async () => {
            const result = await Pipeline.load( { filePath: forbiddenFixture } )

            expect( result[ 'status' ] ).toBe( false )
            expect( result[ 'messages' ].some( ( m ) => m.includes( 'SEC001' ) ) ).toBe( true )
            // main stays null — SchemaLoader (step 2, the import()) never ran
            expect( result[ 'main' ] ).toBeNull()
        } )


        test( 'trusted load (skipScan: true) loads the same forbidden-pattern schema', async () => {
            const result = await Pipeline.load( { filePath: forbiddenFixture, skipScan: true } )

            expect( result[ 'status' ] ).toBe( true )
            expect( result[ 'main' ][ 'namespace' ] ).toBe( 'trustedimport' )
        } )
    } )
} )
