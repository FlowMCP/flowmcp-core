import { pathToFileURL } from 'node:url'
import { join } from 'node:path'


class SharedListResolver {
    static async resolve( { sharedListRefs, listsDir } ) {
        if( !sharedListRefs || sharedListRefs.length === 0 ) {
            return { sharedLists: {} }
        }

        const sharedLists = {}

        const loadPromises = sharedListRefs
            .map( async ( ref ) => {
                const { listName, entries } = await SharedListResolver
                    .#loadAndFilter( { ref, listsDir } )
                sharedLists[ listName ] = entries
            } )

        await Promise.all( loadPromises )

        const frozen = SharedListResolver.#deepFreeze( { obj: sharedLists } )

        return { sharedLists: frozen }
    }


    static interpolateEnum( { template, sharedLists } ) {
        const pattern = /\{\{(\w+):(\w+)\}\}/g
        const result = template.replace( pattern, ( match, listName, fieldName ) => {
            const list = sharedLists[ listName ]

            if( !list ) {
                return match
            }

            const values = list
                .map( ( entry ) => {
                    const value = entry[ fieldName ]

                    return value
                } )
                .filter( ( v ) => {
                    const valid = v !== null && v !== undefined

                    return valid
                } )
                .map( ( v ) => {
                    const str = String( v )

                    return str
                } )

            const joined = values.join( ',' )

            return joined
        } )

        return { result }
    }


    static async #loadAndFilter( { ref, listsDir } ) {
        const { ref: listRef, version, filter } = ref
        const filePath = join( listsDir, `${SharedListResolver.#toKebabCase( { name: listRef } )}.mjs` )
        const fileUrl = pathToFileURL( filePath ).href
        const module = await import( fileUrl )
        const { list } = module

        if( !list || !list['meta'] || !list['entries'] ) {
            throw new Error( `SharedList "${listRef}": Invalid structure, missing meta or entries` )
        }

        if( list['meta']['version'] !== version ) {
            throw new Error(
                `SharedList "${listRef}": Version mismatch, expected "${version}" got "${list['meta']['version']}"`
            )
        }

        let entries = [ ...list['entries'] ]

        if( filter ) {
            entries = SharedListResolver.#applyFilter( { entries, filter } )
        }

        const listName = list['meta']['name']

        return { listName, entries }
    }


    static #applyFilter( { entries, filter } ) {
        const { key } = filter

        if( filter['exists'] !== undefined ) {
            const shouldExist = filter['exists']
            const filtered = entries
                .filter( ( entry ) => {
                    const exists = entry[ key ] !== null && entry[ key ] !== undefined
                    const match = shouldExist ? exists : !exists

                    return match
                } )

            return filtered
        }

        if( filter['value'] !== undefined ) {
            const targetValue = filter['value']
            const filtered = entries
                .filter( ( entry ) => {
                    const match = entry[ key ] === targetValue

                    return match
                } )

            return filtered
        }

        if( filter['in'] !== undefined ) {
            const allowedValues = filter['in']
            const filtered = entries
                .filter( ( entry ) => {
                    const match = allowedValues.includes( entry[ key ] )

                    return match
                } )

            return filtered
        }

        return entries
    }


    static #deepFreeze( { obj } ) {
        Object.freeze( obj )

        Object.keys( obj )
            .forEach( ( key ) => {
                const value = obj[ key ]

                if( typeof value === 'object' && value !== null && !Object.isFrozen( value ) ) {
                    SharedListResolver.#deepFreeze( { obj: value } )
                }
            } )

        return obj
    }


    static #toKebabCase( { name } ) {
        const kebab = name
            .replace( /([a-z])([A-Z])/g, '$1-$2' )
            .toLowerCase()

        return kebab
    }
}


export { SharedListResolver }
