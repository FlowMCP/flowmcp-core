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


    static async load( { requiredLibraries, allowlist } ) {
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

        const libraries = {}

        const loadPromises = requiredLibraries
            .map( async ( lib ) => {
                const module = await import( lib )
                libraries[ lib ] = module.default || module
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
