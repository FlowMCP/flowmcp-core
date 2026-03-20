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
                    messages.push( `SEC013: Library "${lib}" is not on the allowlist` )
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
}


export { LibraryLoader }
