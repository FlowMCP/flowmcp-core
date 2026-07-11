import { createHash } from 'node:crypto'

// Minimal rebuild of the geo.mjs / inkar.mjs pattern: a valid v4 schema that
// carries a real top-level import. The SecurityScanner flags it (SEC001), so a
// default (untrusted) Pipeline.load rejects it BEFORE import(); a trusted load
// (skipScan: true) accepts it. Do NOT copy the real schemas here.
const _fingerprint = ( value ) => createHash( 'sha256' ).update( value ).digest( 'hex' )

export const main = {
    namespace: 'trustedimport',
    name: 'TrustedImport',
    description: 'A valid v4 schema with a real top-level import (trusted-load fixture).',
    version: '4.0.0',
    root: 'https://api.example.com',
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns API status.',
            parameters: [],
            meta: {
                isReadOnly: true,
                isConcurrencySafe: true,
                isDestructive: false,
                searchHint: 'read status',
                aliases: [],
                alwaysLoad: false
            },
            tests: [
                { _description: 't1' },
                { _description: 't2' },
                { _description: 't3' }
            ]
        }
    }
}

export const handlers = () => ( {
    getStatus: {
        postRequest: ( { response } ) => ( { response: { ...response, _fp: _fingerprint( 'status' ) } } )
    }
} )
