import { SecurityScanner } from './task/SecurityScanner.mjs'
import { SchemaLoader } from './task/SchemaLoader.mjs'
import { MainValidator } from './task/MainValidator.mjs'
import { SharedListResolver } from './task/SharedListResolver.mjs'
import { LibraryLoader } from './task/LibraryLoader.mjs'
import { HandlerFactory } from './task/HandlerFactory.mjs'
import { LegacyAdapter } from './task/LegacyAdapter.mjs'
import { Pipeline } from './task/Pipeline.mjs'
import { Fetch } from './task/Fetch.mjs'


class FlowMCP {
    static async loadSchema( { filePath, listsDir, allowlist } ) {
        const result = await Pipeline
            .load( { filePath, listsDir, allowlist } )

        return result
    }


    static async scanSecurity( { filePath } ) {
        const { status, messages } = await SecurityScanner
            .scan( { filePath } )

        return { status, messages }
    }


    static validateMain( { main } ) {
        const { status, messages } = MainValidator
            .validate( { main } )

        return { status, messages }
    }


    static async fetch( { main, handlerMap, userParams, serverParams, routeName } ) {
        const { struct } = await Fetch
            .execute( { main, handlerMap, userParams, serverParams, routeName } )

        return struct
    }


    static async resolveSharedLists( { sharedListRefs, listsDir } ) {
        const { sharedLists } = await SharedListResolver
            .resolve( { sharedListRefs, listsDir } )

        return { sharedLists }
    }


    static interpolateEnum( { template, sharedLists } ) {
        const { result } = SharedListResolver
            .interpolateEnum( { template, sharedLists } )

        return { result }
    }


    static async loadLibraries( { requiredLibraries, allowlist } ) {
        const { libraries } = await LibraryLoader
            .load( { requiredLibraries, allowlist } )

        return { libraries }
    }


    static createHandlers( { handlersFn, sharedLists, libraries, routeNames } ) {
        const { handlerMap } = HandlerFactory
            .create( { handlersFn, sharedLists, libraries, routeNames } )

        return { handlerMap }
    }


    static detectLegacy( { module } ) {
        const { isLegacy, format } = LegacyAdapter
            .detect( { module } )

        return { isLegacy, format }
    }


    static adaptLegacy( { legacySchema } ) {
        const { main, handlersFn, hasHandlers, warnings } = LegacyAdapter
            .adapt( { legacySchema } )

        return { main, handlersFn, hasHandlers, warnings }
    }


    static getDefaultAllowlist() {
        const { allowlist } = LibraryLoader
            .getDefaultAllowlist()

        return { allowlist }
    }
}


export { FlowMCP }
export { SecurityScanner } from './task/SecurityScanner.mjs'
export { SchemaLoader } from './task/SchemaLoader.mjs'
export { MainValidator } from './task/MainValidator.mjs'
export { SharedListResolver } from './task/SharedListResolver.mjs'
export { LibraryLoader } from './task/LibraryLoader.mjs'
export { HandlerFactory } from './task/HandlerFactory.mjs'
export { LegacyAdapter } from './task/LegacyAdapter.mjs'
export { Pipeline } from './task/Pipeline.mjs'
export { Fetch } from './task/Fetch.mjs'
