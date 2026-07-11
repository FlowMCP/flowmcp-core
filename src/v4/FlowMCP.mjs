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

import { Pipeline } from './task/Pipeline.mjs'
import { Fetch } from './task/Fetch.mjs'
import { SecurityScanner } from './task/SecurityScanner.mjs'
import { MainValidator } from './task/MainValidator.mjs'
import { SharedListResolver } from './task/SharedListResolver.mjs'
import { LibraryLoader } from './task/LibraryLoader.mjs'
import { HandlerFactory } from './task/HandlerFactory.mjs'
import { ResourceDatabaseManager } from './task/ResourceDatabaseManager.mjs'
import { OutputSchemaGenerator } from './task/OutputSchemaGenerator.mjs'
import { AgentManifestValidator } from './task/AgentManifestValidator.mjs'
import { IdResolver } from './task/IdResolver.mjs'
import { ZodBuilder } from './task/ZodBuilder.mjs'


class FlowMCP {
    static async loadSchema( { filePath, listsDir, allowlist, resolveBase, selectionFiles, prefillTimeout, fetchFn, userParams } ) {
        const result = await Pipeline
            .load( { filePath, listsDir, allowlist, resolveBase, selectionFiles, prefillTimeout, fetchFn, userParams } )

        return result
    }


    static async scanSecurity( { filePath, skipScan } ) {
        const { status, messages } = await SecurityScanner
            .scan( { filePath, skipScan } )

        return { status, messages }
    }


    static validateMain( { main } ) {
        const { status, messages, warnings } = MainValidator
            .validate( { main } )

        return { status, messages, warnings }
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


    static async loadLibraries( { requiredLibraries, allowlist, resolveBase } ) {
        const { libraries } = await LibraryLoader
            .load( { requiredLibraries, allowlist, resolveBase } )

        return { libraries }
    }


    static getDefaultAllowlist() {
        const { allowlist } = LibraryLoader
            .getDefaultAllowlist()

        return { allowlist }
    }


    static createHandlers( { handlersFn, sharedLists, libraries, routeNames, resources } ) {
        const { handlerMap, resourceHandlerMap } = HandlerFactory
            .create( { handlersFn, sharedLists, libraries, routeNames, resources } )

        return { handlerMap, resourceHandlerMap }
    }


    static async executeResource( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } ) {
        const result = await Pipeline
            .executeResource( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } )

        return result
    }


    static async initializeResourceDbs( { resources, schemaRef, schemaDir } ) {
        const result = await ResourceDatabaseManager
            .initialize( { resources, schemaRef, schemaDir } )

        return result
    }


    static generateOutputSchema( { response, mimeType, schemaId } ) {
        const result = OutputSchemaGenerator
            .generateFromResponse( { response, mimeType, schemaId } )

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


    static prepareServerTool( { main, handlerMap, serverParams, routeName, source = null, disambiguate = false } ) {
        const namespace = main[ 'namespace' ] || 'unknown'
        const routes = main[ 'tools' ] || {}
        const routeConfig = routes[ routeName ]

        if( !routeConfig ) {
            throw new Error( `Route "${routeName}" not found in schema "${namespace}"` )
        }

        const { toolName } = FlowMCP.buildToolName( { routeName, namespace, source, disambiguate } )
        const { description } = routeConfig
        const zod = ZodBuilder.getZodSchema( { 'route': routeConfig } )

        const func = async ( userParams ) => {
            const fetchResult = await FlowMCP.fetch( {
                main,
                handlerMap,
                userParams,
                serverParams,
                routeName
            } )

            const { status, messages, data, dataAsString } = fetchResult

            return { status, messages, data, dataAsString }
        }

        return { toolName, description, zod, func }
    }


    static buildToolName( { routeName, namespace, source = null, disambiguate = false } ) {
        const routeNameSnakeCase = routeName
            .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
            .toLowerCase()
        const namespaceSnakeCase = namespace
            .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
            .toLowerCase()

        const sanitize = ( value ) => value
            .replaceAll( ':', '' )
            .replaceAll( '-', '_' )
            .replaceAll( '/', '_' )

        if( disambiguate === true && typeof source === 'string' && source.length > 0 ) {
            const sourceSnakeCase = source
                .replace( /([a-z0-9])([A-Z])/g, '$1_$2' )
                .toLowerCase()
            const suffix = `_${sanitize( sourceSnakeCase )}`
            const baseCap = Math.max( 0, 63 - suffix.length )
            const base = sanitize( `${routeNameSnakeCase}_${namespaceSnakeCase}` ).substring( 0, baseCap )
            const toolName = `${base}${suffix}`.substring( 0, 63 )

            return { toolName }
        }

        let toolName = `${routeNameSnakeCase}_${namespaceSnakeCase}`
        toolName = sanitize( toolName.substring( 0, 63 ) )

        return { toolName }
    }
}


export { FlowMCP }
