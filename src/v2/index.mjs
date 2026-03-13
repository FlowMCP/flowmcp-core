import { SecurityScanner } from './task/SecurityScanner.mjs'
import { SchemaLoader } from './task/SchemaLoader.mjs'
import { MainValidator } from './task/MainValidator.mjs'
import { SharedListResolver } from './task/SharedListResolver.mjs'
import { LibraryLoader } from './task/LibraryLoader.mjs'
import { HandlerFactory } from './task/HandlerFactory.mjs'
import { LegacyAdapter } from './task/LegacyAdapter.mjs'
import { OutputSchemaGenerator } from './task/OutputSchemaGenerator.mjs'
import { Pipeline } from './task/Pipeline.mjs'
import { Fetch } from './task/Fetch.mjs'
import { IdResolver } from './task/IdResolver.mjs'
import { AgentManifestLoader } from './task/AgentManifestLoader.mjs'
import { AgentManifestValidator } from './task/AgentManifestValidator.mjs'


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


    static createHandlers( { handlersFn, sharedLists, libraries, routeNames, resources } ) {
        const { handlerMap, resourceHandlerMap } = HandlerFactory
            .create( { handlersFn, sharedLists, libraries, routeNames, resources } )

        return { handlerMap, resourceHandlerMap }
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


    static generateOutputSchema( { response, mimeType } ) {
        const { output } = OutputSchemaGenerator
            .generate( { response, mimeType } )

        return { output }
    }


    static async executeResource( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } ) {
        const result = await Pipeline
            .executeResource( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } )

        return result
    }


    static async initializeResourceDbs( { resources, schemaRef } ) {
        const result = await ResourceDatabaseManager
            .initialize( { resources, schemaRef } )

        return result
    }


    static async loadAgent( { manifestPath, listsDir } ) {
        const result = await Pipeline
            .loadAgent( { manifestPath, listsDir } )

        return result
    }


    static validateAgentManifest( { manifest } ) {
        const { status, messages } = AgentManifestValidator
            .validate( { manifest } )

        return { status, messages }
    }


    static parseId( { id } ) {
        const result = IdResolver
            .parse( { id } )

        return result
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
export { OutputSchemaGenerator } from './task/OutputSchemaGenerator.mjs'
export { SkillLoader } from './task/SkillLoader.mjs'
export { SkillValidator } from './task/SkillValidator.mjs'
export { ResourceValidator } from './task/ResourceValidator.mjs'
export { ResourceExecutor } from './task/ResourceExecutor.mjs'
export { ResourceDatabaseManager } from './task/ResourceDatabaseManager.mjs'
export { ResourceMarkdownLoader } from './task/ResourceMarkdownLoader.mjs'
export { PromptValidator } from './task/PromptValidator.mjs'
export { IdResolver } from './task/IdResolver.mjs'
export { PromptLoader } from './task/PromptLoader.mjs'
export { AgentManifestLoader } from './task/AgentManifestLoader.mjs'
export { AgentManifestValidator } from './task/AgentManifestValidator.mjs'
export { AgentTestRunner } from './task/AgentTestRunner.mjs'
