import { describe, test, expect } from '@jest/globals'
import { SecurityScanner } from '../../src/v2/task/SecurityScanner.mjs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures', 'schemas' )


describe( 'SecurityScanner', () => {
    describe( 'scan()', () => {
        test( 'passes a clean minimal schema', async () => {
            const filePath = join( fixturesDir, 'valid-minimal.mjs' )
            const { status, messages } = await SecurityScanner
                .scan( { filePath } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes a clean schema with handlers', async () => {
            const filePath = join( fixturesDir, 'valid-with-handlers.mjs' )
            const { status, messages } = await SecurityScanner
                .scan( { filePath } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'rejects schema with import statement', async () => {
            const filePath = join( fixturesDir, 'invalid-has-import.mjs' )
            const { status, messages } = await SecurityScanner
                .scan( { filePath } )

            expect( status ).toBe( false )
            expect( messages.length ).toBeGreaterThan( 0 )

            const hasImportViolation = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'SEC001' ) && msg.includes( 'import' )

                    return match
                } )

            expect( hasImportViolation ).toBe( true )
        } )


        test( 'rejects schema with eval()', async () => {
            const filePath = join( fixturesDir, 'invalid-has-eval.mjs' )
            const { status, messages } = await SecurityScanner
                .scan( { filePath } )

            expect( status ).toBe( false )

            const hasEvalViolation = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'SEC003' ) && msg.includes( 'eval' )

                    return match
                } )

            expect( hasEvalViolation ).toBe( true )
        } )


        test( 'rejects schema with process.env', async () => {
            const filePath = join( fixturesDir, 'invalid-has-process.mjs' )
            const { status, messages } = await SecurityScanner
                .scan( { filePath } )

            expect( status ).toBe( false )

            const hasProcessViolation = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'SEC006' ) && msg.includes( 'process' )

                    return match
                } )

            expect( hasProcessViolation ).toBe( true )
        } )


        test( 'reports all violations in a single pass', async () => {
            const content = [
                'import { foo } from "bar"',
                'const x = eval( "1+1" )',
                'const y = process.env.KEY'
            ].join( '\n' )

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'test-multi.mjs' } )

            expect( status ).toBe( false )
            expect( messages.length ).toBeGreaterThanOrEqual( 3 )

            const codes = messages
                .map( ( msg ) => {
                    const code = msg.split( ' ' )[ 0 ]

                    return code
                } )

            expect( codes ).toContain( 'SEC001' )
            expect( codes ).toContain( 'SEC003' )
            expect( codes ).toContain( 'SEC006' )
        } )


        test( 'includes line numbers in error messages', async () => {
            const content = [
                'const a = 1',
                'const b = eval( "test" )',
                'const c = 3'
            ].join( '\n' )

            const { messages } = SecurityScanner
                .scanString( { content, filePath: 'test-lines.mjs' } )

            expect( messages.length ).toBe( 1 )
            expect( messages[ 0 ] ).toContain( 'line 2' )
        } )


        test( 'ignores patterns in comments', async () => {
            const content = [
                '// import { foo } from "bar"',
                '/* eval( "test" ) */',
                '* process.env.KEY',
                'const clean = "hello"'
            ].join( '\n' )

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'test-comments.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )
    } )
} )
