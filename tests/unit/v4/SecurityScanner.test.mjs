import { describe, test, expect } from '@jest/globals'
import { SecurityScanner } from '../../../src/v4/task/SecurityScanner.mjs'
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


    // Memo 152 / PRD-022 (E-06) — scanner hardening. Two dimensions:
    //   (1) false NEGATIVE: dynamic `import(` + computed/aliased member access on forbidden
    //       globals must be caught (the old 'import ' substring let `import(` through).
    //   (2) false POSITIVE robustness: comment-/string-/URL-stripping so real schema styles
    //       (doc-comment convention, URLs, rate-limit setTimeout sleeps) pass the gate.
    describe( 'hardening — false negatives (E-06)', () => {
        test( 'rejects dynamic import( with no space (US-2)', () => {
            const content = 'const cp = await import( \'node:child_process\' )'

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'dyn-import.mjs' } )

            expect( status ).toBe( false )

            const hasImport = messages
                .some( ( msg ) => msg.includes( 'SEC001' ) && msg.includes( 'import' ) )

            expect( hasImport ).toBe( true )
        } )


        test( 'rejects import( glued to the paren (import(x))', () => {
            const content = 'const m = import(\'fs\')'

            const { status } = SecurityScanner
                .scanString( { content, filePath: 'dyn-import2.mjs' } )

            expect( status ).toBe( false )
        } )


        test( 'rejects computed member access on a forbidden global (US-2, A-prime)', () => {
            const content = 'const secret = globalThis[ \'process\' ].env.KEY'

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'computed-global.mjs' } )

            expect( status ).toBe( false )

            const hasGlobal = messages
                .some( ( msg ) => msg.includes( 'SEC011' ) )

            expect( hasGlobal ).toBe( true )
        } )


        test( 'rejects computed process access (process[])', () => {
            const content = 'const h = process[ \'env\' ].HOME'

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'computed-process.mjs' } )

            expect( status ).toBe( false )

            const hasProcess = messages
                .some( ( msg ) => msg.includes( 'SEC006' ) )

            expect( hasProcess ).toBe( true )
        } )


        test( 'still rejects a real top-level import statement (geo/inkar style)', () => {
            const content = [
                'import https from \'node:https\'',
                'import { rootCertificates } from \'node:tls\'',
                'export const main = {}'
            ].join( '\n' )

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'top-level-import.mjs' } )

            expect( status ).toBe( false )

            const importHits = messages
                .filter( ( msg ) => msg.includes( 'SEC001' ) )

            expect( importHits.length ).toBe( 2 )
        } )
    } )


    describe( 'hardening — false positives (E-06)', () => {
        test( 'passes the // Import: doc-comment convention (abi-utils.mjs style, US-1)', () => {
            const content = [
                '// Import: import { ethers } from \'ethers\'',
                'export const handlers = {}'
            ].join( '\n' )

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'doc-comment.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes fs. inside URL strings (dottEscooter/bfsodl style, US-1)', () => {
            const content = [
                'const main = {',
                '    docs: [ \'https://gbfs.api.ridedott.com/public/v2/berlin/gbfs.json\' ],',
                '    root: \'https://www.imis.bfs.de\',',
                '    termsOfService: \'https://www.imis.bfs.de/geoportal/resources/sitepolicy.html\'',
                '}'
            ].join( '\n' )

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'fs-url.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes global. inside a URL string (flixbus style)', () => {
            const content = 'const root = \'https://global.api.flixbus.com\''

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'global-url.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes setTimeout rate-limit sleep in a handler (taapi style, US-1)', () => {
            const content = [
                'const handler = async () => {',
                '    const sleep = ( ms ) => new Promise( ( resolve ) => setTimeout( resolve, ms ) )',
                '    await sleep( 1000 )',
                '}'
            ].join( '\n' )

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'settimeout.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes the import substring inside a description string (wto style)', () => {
            const content = 'const d = \'Count US merchandise import data points\''

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'import-in-string.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes a forbidden pattern hidden in an inline comment', () => {
            const content = 'const x = 1 // process.env.SECRET and eval( evil )'

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'inline-comment.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes a forbidden pattern hidden in a multi-line block comment', () => {
            const content = [
                'const a = 1',
                '/*',
                ' import fs from \'node:fs\'',
                ' process.env.KEY',
                '*/',
                'const b = 2'
            ].join( '\n' )

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'block-comment.mjs' } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'still flags real code that FOLLOWS a closed string on the same line', () => {
            const content = 'const u = "http://gbfs.api.com"; const s = process.env.KEY'

            const { status, messages } = SecurityScanner
                .scanString( { content, filePath: 'mixed-line.mjs' } )

            expect( status ).toBe( false )

            const hasProcess = messages
                .some( ( msg ) => msg.includes( 'SEC006' ) )

            expect( hasProcess ).toBe( true )
        } )
    } )
} )
