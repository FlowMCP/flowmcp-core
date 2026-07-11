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

import { createRequire } from 'node:module'
import { join } from 'node:path'


class LibraryLoader {
    static #defaultAllowlist = [
        // Node.js Built-ins
        'zlib',
        'crypto',
        'buffer',
        'path',
        'url',
        'util',
        'stream',
        'querystring',
        // Blockchain / Web3
        'ethers',
        // Trading / Finance
        'ccxt',
        'indicatorts',
        'yahoo-finance2',
        'trading-signals',
        'talib',
        'technicalindicators',
        'moment',
        // Visualization
        'vega-lite',
        'vega',
        'canvas',
        // Storage / IPFS
        'pinata',
        'irys',
        // Database
        'better-sqlite3'
    ]


    static async load( { requiredLibraries, allowlist, resolveBase } ) {
        if( !requiredLibraries || requiredLibraries.length === 0 ) {
            return { libraries: {} }
        }

        const effectiveAllowlist = allowlist || LibraryLoader.#defaultAllowlist
        const messages = []

        requiredLibraries
            .forEach( ( lib ) => {
                if( !effectiveAllowlist.includes( lib ) ) {
                    messages.push( `SEC020: Library "${lib}" is not on the allowlist` )
                }
            } )

        if( messages.length > 0 ) {
            throw new Error( messages.join( '; ' ) )
        }

        // resolveBase: directory whose node_modules holds native/CJS libs (e.g. talib).
        // Default is the host process cwd — the project that runs FlowMCP. Callers may pass
        // an explicit base. createRequire wants a referencing filename, so we anchor on an
        // index.js inside the base (the file need not exist; only its directory is used).
        const effectiveBase = resolveBase || process.cwd()
        const requireFromBase = createRequire( join( effectiveBase, 'index.js' ) )
        const libraries = {}

        const loadPromises = requiredLibraries
            .map( async ( lib ) => {
                try {
                    const module = await import( lib )
                    libraries[ lib ] = module.default || module
                } catch( importError ) {
                    // Fallback for native (.node) bindings and libs not resolvable as ESM
                    // from core (e.g. talib): resolve + require from the host base. CJS
                    // require handles native addons that ESM import rejects with
                    // ERR_UNKNOWN_FILE_EXTENSION '.node'. Allowlist check above stays
                    // in front (fail-closed) — this only changes HOW an allowed lib loads.
                    const module = requireFromBase( lib )
                    libraries[ lib ] = module.default || module
                }
            } )

        await Promise.all( loadPromises )

        return { libraries }
    }


    static getDefaultAllowlist() {
        const allowlist = [ ...LibraryLoader.#defaultAllowlist ]

        return { allowlist }
    }


    static mergeAllowlist( { extraAllowlist } ) {
        const isArray = Array.isArray( extraAllowlist )
        const extra = isArray ? extraAllowlist : []
        const merged = [ ...LibraryLoader.#defaultAllowlist, ...extra ]
        const deduped = Array.from( new Set( merged ) )

        return { allowlist: deduped }
    }
}


export { LibraryLoader }
