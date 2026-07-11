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


    static async load( { requiredLibraries, allowlist, resolveBase, resolveBases } ) {
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

        // Ordered resolution bases (Memo 150 model): each base is a directory whose
        // node_modules may hold native/CJS libs (e.g. talib). `resolveBases[]` wins
        // (allowed-libraries -> CLI-base -> schema-dir, in the caller's order); the
        // legacy singular `resolveBase` is accepted as a one-element list; otherwise
        // the host process cwd is the only base. createRequire wants a referencing
        // filename, so each base is anchored on an index.js inside it (need not exist).
        const orderedBases = Array.isArray( resolveBases ) && resolveBases.length > 0
            ? resolveBases
            : ( resolveBase ? [ resolveBase ] : [ process.cwd() ] )
        const libraries = {}

        const loadPromises = requiredLibraries
            .map( async ( lib ) => {
                const module = await LibraryLoader.#resolveOne( { lib, orderedBases } )
                libraries[ lib ] = module
            } )

        await Promise.all( loadPromises )

        return { libraries }
    }


    static async #resolveOne( { lib, orderedBases } ) {
        try {
            const module = await import( lib )

            return module.default || module
        } catch( importError ) {
            // Fallback for native (.node) bindings and libs not resolvable as ESM from
            // core (e.g. talib): resolve + require from each base in order, first hit
            // wins. CJS require handles native addons that ESM import rejects with
            // ERR_UNKNOWN_FILE_EXTENSION '.node'. The allowlist check upstream stays in
            // front (fail-closed) — this only changes HOW an allowed lib loads.
            const { resolved, value, lastError } = LibraryLoader
                .#requireFromBases( { lib, orderedBases } )

            if( !resolved ) {
                const detail = lastError !== null ? lastError.message : 'no resolution bases provided'

                throw new Error( `Library "${lib}" not resolvable from any base — ${detail}` )
            }

            return value
        }
    }


    static #requireFromBases( { lib, orderedBases } ) {
        const outcome = orderedBases
            .reduce( ( acc, base ) => {
                if( acc.resolved ) {
                    return acc
                }

                try {
                    const requireFromBase = createRequire( join( base, 'index.js' ) )
                    const module = requireFromBase( lib )

                    return { resolved: true, value: module.default || module, lastError: null }
                } catch( err ) {
                    return { resolved: false, value: null, lastError: err }
                }
            }, { resolved: false, value: null, lastError: null } )

        return outcome
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
