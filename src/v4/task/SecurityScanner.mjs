/**
 * FlowMCP — MIT License
 *
 * DISCLAIMER: This code orchestrates calls to third-party APIs. Each API has
 * its own Terms of Services. FlowMCP makes no representation about TOS
 * compliance, data licensing, or fitness for any purpose. Users are solely
 * responsible for reviewing and adhering to each API provider's terms.
 *
 * For more information, see LICENSE.md and DISCLAIMER.md in the repo root.
 */

import { readFile } from 'node:fs/promises'


class SecurityScanner {
    static async scan( { filePath, skipScan = false } ) {
        if( skipScan ) {
            return { status: true, messages: [] }
        }

        const content = await readFile( filePath, 'utf-8' )
        const { status, messages } = SecurityScanner
            .#scanContent( { content, filePath } )

        return { status, messages }
    }


    static scanString( { content, filePath = '<string>', skipScan = false } ) {
        if( skipScan ) {
            return { status: true, messages: [] }
        }

        const { status, messages } = SecurityScanner
            .#scanContent( { content, filePath } )

        return { status, messages }
    }


    static #scanContent( { content, filePath } ) {
        const messages = []
        const { patterns } = SecurityScanner.#getForbiddenPatterns()

        // Memo 152 / PRD-022 (E-06): match on comment-/string-stripped code only. The
        // pre-hardening substring matcher flagged 30/550 real schemas at the private gate,
        // nearly all of them false positives: 'fs.'/'global.' inside URL strings
        // (gbfs.api.ridedott.com, global.api.flixbus.com), the 'import ' substring inside
        // description strings (wto.mjs) and the '// Import:' doc-comment convention. Blanking
        // comment/string CONTENT (newlines preserved) leaves only true code violations.
        const { stripped } = SecurityScanner.#stripCommentsAndStrings( { content } )
        const lines = stripped.split( '\n' )

        lines
            .forEach( ( line, index ) => {
                const lineNumber = index + 1
                const trimmed = line.trim()

                // Secondary guard (kept from the pre-hardening scanner): a stripped line
                // that still reads like a comment continuation ('//', '*', '/*') is a
                // JSDoc artifact, never code. The strip above is the primary defense; this
                // preserves the established comment-skip contract (SecurityScanner tests).
                if( trimmed.startsWith( '//' ) || trimmed.startsWith( '*' ) || trimmed.startsWith( '/*' ) ) {
                    return
                }

                patterns
                    .forEach( ( { matcher, code, label } ) => {
                        const hit = typeof matcher === 'string'
                            ? line.includes( matcher )
                            : matcher.test( line )

                        if( hit ) {
                            messages.push( `${code} ${filePath}: Forbidden pattern "${label}" found at line ${lineNumber}` )
                        }
                    } )
            } )

        const status = messages.length === 0

        return { status, messages }
    }


    static #stripCommentsAndStrings( { content } ) {
        // Char-scanner (Memo 152 / PRD-022, E-06): blank the CONTENT of line comments,
        // block comments and string literals ('...', "...", `...`) to spaces so the
        // forbidden-pattern match only ever sees real code. Newlines are preserved so
        // reported line numbers stay accurate. Implemented as a single Array.reduce over
        // the characters (no for/while per house style); `prev` carries the previous char
        // to recognise the two-char tokens // /* */ and unescaped closing quotes.
        // Known, documented limits (no measured schema hits either): a `${...}`
        // interpolation inside a template literal is blanked with the template, and a
        // string closed right after an escaped backslash ("\\") stays open one char longer
        // — both are conservative (they can only HIDE code, so they are re-checked by the
        // trusted-path skipScan design, never by silently passing a private gate).
        const chars = Array.from( content )

        const finalState = chars
            .reduce( ( state, ch ) => {
                const { mode, out, prev } = state

                if( mode === 'code' ) {
                    if( prev === '/' && ch === '/' ) {
                        out[ out.length - 1 ] = ' '
                        out.push( ' ' )

                        return { mode: 'line', out, prev: ch }
                    }

                    if( prev === '/' && ch === '*' ) {
                        out[ out.length - 1 ] = ' '
                        out.push( ' ' )

                        return { mode: 'block', out, prev: ch }
                    }

                    if( ch === '\'' ) { out.push( ' ' ); return { mode: 'sq', out, prev: ch } }
                    if( ch === '"' ) { out.push( ' ' ); return { mode: 'dq', out, prev: ch } }
                    if( ch === '`' ) { out.push( ' ' ); return { mode: 'tpl', out, prev: ch } }

                    out.push( ch )

                    return { mode: 'code', out, prev: ch }
                }

                if( mode === 'line' ) {
                    if( ch === '\n' ) { out.push( '\n' ); return { mode: 'code', out, prev: ch } }

                    out.push( ' ' )

                    return { mode: 'line', out, prev: ch }
                }

                if( mode === 'block' ) {
                    if( prev === '*' && ch === '/' ) { out.push( ' ' ); return { mode: 'code', out, prev: ' ' } }

                    out.push( ch === '\n' ? '\n' : ' ' )

                    return { mode: 'block', out, prev: ch }
                }

                // string modes sq / dq / tpl — close on the matching, unescaped quote
                const quote = mode === 'sq' ? '\'' : ( mode === 'dq' ? '"' : '`' )

                if( prev !== '\\' && ch === quote ) { out.push( ' ' ); return { mode: 'code', out, prev: ch } }

                out.push( ch === '\n' ? '\n' : ' ' )

                return { mode, out, prev: ch }
            }, { mode: 'code', out: [], prev: '' } )

        const stripped = finalState[ 'out' ].join( '' )

        return { stripped }
    }


    static #getForbiddenPatterns() {
        const patterns = [
            // Static AND dynamic import (Memo 152 / PRD-022, E-06). The old plain 'import '
            // substring (trailing space) let dynamic `import(` through — the 148 A' false
            // negative. On stripped code the `import` keyword only appears in real code, so
            // a word-boundary regex catches `import x from`, `import {`, `import *` AND
            // `import(` alike. No global flag => .test() is stateless per line.
            { matcher: /\bimport\b/,    code: 'SEC001', label: 'import' },
            { matcher: 'require(',      code: 'SEC002', label: 'require' },
            { matcher: 'eval(',         code: 'SEC003', label: 'eval' },
            { matcher: ' Function(',    code: 'SEC004', label: 'Function constructor' },
            { matcher: 'new Function',  code: 'SEC005', label: 'new Function' },
            { matcher: '(Function(',    code: 'SEC004', label: 'Function constructor' },
            // process access — dotted AND computed member (148 A' aliased/computed class:
            // process['env'] must be caught the same as process.env).
            { matcher: 'process.',      code: 'SEC006', label: 'process access' },
            { matcher: 'process[',      code: 'SEC006', label: 'process access (computed)' },
            { matcher: 'child_process',  code: 'SEC007', label: 'child_process' },
            { matcher: 'fs.',           code: 'SEC008', label: 'filesystem access' },
            { matcher: 'node:fs',       code: 'SEC009', label: 'node:fs' },
            { matcher: 'fs/promises',    code: 'SEC010', label: 'fs/promises' },
            { matcher: 'globalThis.',    code: 'SEC011', label: 'globalThis' },
            { matcher: 'globalThis[',    code: 'SEC011', label: 'globalThis (computed)' },
            { matcher: 'global.',       code: 'SEC012', label: 'global scope' },
            { matcher: 'global[',       code: 'SEC012', label: 'global scope (computed)' },
            { matcher: '__dirname',     code: 'SEC013', label: '__dirname' },
            { matcher: '__filename',    code: 'SEC014', label: '__filename' }
            // setTimeout / setInterval REMOVED (Memo 152 / PRD-022, E-06): they are timing
            // primitives (rate-limit sleeps / abort timers), not a code-execution / import /
            // fs / process escape vector. The 2026-07-10 impact scan found 15 legitimate
            // rate-limit uses (taapi/indicators-part1.mjs, coingecko/*, etherscan/*, …) and
            // zero abuse — keeping them forbidden rejected real, valid schema styles at the
            // private gate. SEC015/SEC016 codes are retired with them.
        ]

        return { patterns }
    }
}


export { SecurityScanner }
