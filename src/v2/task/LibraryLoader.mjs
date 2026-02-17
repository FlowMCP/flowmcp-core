class LibraryLoader {
    static #defaultAllowlist = [
        'zlib',
        'crypto',
        'buffer',
        'path',
        'url',
        'util',
        'stream',
        'querystring'
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
