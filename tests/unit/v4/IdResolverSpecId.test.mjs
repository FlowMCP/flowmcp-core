import { describe, it, expect } from '@jest/globals'
import { IdResolver } from '../../../src/v4/task/IdResolver.mjs'


// Memo 152 / PRD-018 (D-07) — the CLI spec-id grammar ported into core. These
// tests pin the byte-compatible behavior the CLI delegation depends on.

describe( 'IdResolver.parseSpecId (Memo 152 / PRD-018 D-07)', () => {
    it( 'parses a bare namespace as type "namespace"', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'etherscan' } )

        expect( parsed.valid ).toBe( true )
        expect( parsed.type ).toBe( 'namespace' )
        expect( parsed.namespace ).toBe( 'etherscan' )
        expect( parsed.source ).toBe( null )
    } )


    it( 'rejects an upper-case namespace (no silent normalize)', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'Etherscan' } )

        expect( parsed.valid ).toBe( false )
        expect( parsed.error ).toMatch( /Invalid namespace/ )
    } )


    it( '1 slash = schema', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'etherscan/balance' } )

        expect( parsed ).toMatchObject( { valid: true, type: 'schema', namespace: 'etherscan', name: 'balance' } )
    } )


    it( '2 slashes = tool', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'etherscan/tool/getBalance' } )

        expect( parsed ).toMatchObject( { valid: true, type: 'tool', name: 'getBalance' } )
    } )


    it( '2 slashes with unknown type is a hard error', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'etherscan/bogus/foo' } )

        expect( parsed.valid ).toBe( false )
        expect( parsed.error ).toMatch( /tool\|resource\|prompt\|skill\|selection\|agent/ )
    } )


    it( '4 slashes = per-test selector with 1-based index', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'etherscan/tool/getBalance/tests/2' } )

        expect( parsed ).toMatchObject( { valid: true, type: 'test', name: 'getBalance', testIndex: 2 } )
    } )


    it( 'rejects a non-positive test index', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'etherscan/tool/getBalance/tests/0' } )

        expect( parsed.valid ).toBe( false )
        expect( parsed.error ).toMatch( /positive 1-based integer/ )
    } )


    it( 'splits a leading "<source>:" prefix off a tool id', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'Production:etherscan/tool/getBalance' } )

        expect( parsed ).toMatchObject( { valid: true, source: 'Production', type: 'tool', namespace: 'etherscan', name: 'getBalance' } )
    } )


    it( 'rejects an empty source ("...:foo")', () => {
        const parsed = IdResolver.parseSpecId( { specId: ':etherscan' } )

        expect( parsed.valid ).toBe( false )
        expect( parsed.error ).toMatch( /source coordinate/ )
    } )


    it( 'rejects an empty remainder ("source:")', () => {
        const parsed = IdResolver.parseSpecId( { specId: 'Production:' } )

        expect( parsed.valid ).toBe( false )
        expect( parsed.error ).toMatch( /nothing after/ )
    } )


    it( 'rejects a non-string / empty spec-id', () => {
        expect( IdResolver.parseSpecId( { specId: '' } ).valid ).toBe( false )
        expect( IdResolver.parseSpecId( { specId: 42 } ).valid ).toBe( false )
    } )
} )
