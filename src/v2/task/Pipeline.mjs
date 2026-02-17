import { SecurityScanner } from './SecurityScanner.mjs'
import { SchemaLoader } from './SchemaLoader.mjs'
import { MainValidator } from './MainValidator.mjs'
import { SharedListResolver } from './SharedListResolver.mjs'
import { LibraryLoader } from './LibraryLoader.mjs'
import { HandlerFactory } from './HandlerFactory.mjs'
import { LegacyAdapter } from './LegacyAdapter.mjs'


class Pipeline {
    static async load( { filePath, listsDir, allowlist } ) {
        const warnings = []

        const { status: scanStatus, messages: scanMessages } = await SecurityScanner
            .scan( { filePath } )

        if( !scanStatus ) {
            return {
                status: false,
                messages: scanMessages,
                main: null,
                handlerMap: {},
                sharedLists: {},
                libraries: {},
                warnings
            }
        }

        const loaded = await SchemaLoader
            .load( { filePath } )

        const { isLegacy, format } = LegacyAdapter
            .detect( { module: loaded } )

        let main = null
        let handlersFn = null
        let hasHandlers = false

        if( isLegacy ) {
            const adapted = LegacyAdapter
                .adapt( { legacySchema: loaded['schema'] } )
            main = adapted['main']
            handlersFn = adapted['handlersFn']
            hasHandlers = adapted['hasHandlers']
            adapted['warnings']
                .forEach( ( w ) => { warnings.push( w ) } )
        } else {
            main = loaded['main']
            handlersFn = loaded['handlersFn']
            hasHandlers = loaded['hasHandlers']
        }

        const { status: validStatus, messages: validMessages } = MainValidator
            .validate( { main } )

        if( !validStatus ) {
            return {
                status: false,
                messages: validMessages,
                main,
                handlerMap: {},
                sharedLists: {},
                libraries: {},
                warnings
            }
        }

        const sharedListRefs = main['sharedLists'] || []
        let sharedLists = {}

        if( sharedListRefs.length > 0 && listsDir ) {
            const resolved = await SharedListResolver
                .resolve( { sharedListRefs, listsDir } )
            sharedLists = resolved['sharedLists']
        }

        const requiredLibraries = main['requiredLibraries'] || []
        let libraries = {}

        if( requiredLibraries.length > 0 ) {
            const loaded = await LibraryLoader
                .load( { requiredLibraries, allowlist } )
            libraries = loaded['libraries']
        }

        const routeNames = Object.keys( main['routes'] )
        const { handlerMap } = HandlerFactory
            .create( { handlersFn, sharedLists, libraries, routeNames } )

        return {
            status: true,
            messages: [],
            main,
            handlerMap,
            sharedLists,
            libraries,
            warnings
        }
    }
}


export { Pipeline }
