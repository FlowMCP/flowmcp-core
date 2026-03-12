import { SecurityScanner } from './SecurityScanner.mjs'
import { SchemaLoader } from './SchemaLoader.mjs'
import { MainValidator } from './MainValidator.mjs'
import { SharedListResolver } from './SharedListResolver.mjs'
import { LibraryLoader } from './LibraryLoader.mjs'
import { HandlerFactory } from './HandlerFactory.mjs'
import { LegacyAdapter } from './LegacyAdapter.mjs'
import { SkillLoader } from './SkillLoader.mjs'
import { SkillValidator } from './SkillValidator.mjs'
import { ResourceValidator } from './ResourceValidator.mjs'
import { ResourceExecutor } from './ResourceExecutor.mjs'

import { dirname } from 'node:path'


class Pipeline {
    static async load( { filePath, listsDir, allowlist } ) {
        const warnings = []

        const { status: scanStatus, messages: scanMessages } = await SecurityScanner
            .scan( { filePath } )

        if( !scanStatus ) {
            return Pipeline.#buildResult( {
                status: false,
                messages: scanMessages,
                warnings
            } )
        }

        const loaded = await SchemaLoader
            .load( { filePath } )

        if( loaded['messages'] && loaded['messages'].length > 0 ) {
            loaded['messages']
                .forEach( ( msg ) => { warnings.push( msg ) } )
        }

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
            return Pipeline.#buildResult( {
                status: false,
                messages: validMessages,
                main,
                warnings
            } )
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

        const toolsKey = main['tools'] ? 'tools' : 'routes'
        const toolsObj = main[ toolsKey ] || {}
        const routeNames = Object.keys( toolsObj )

        const { handlerMap, resourceHandlerMap } = HandlerFactory
            .create( { handlersFn, sharedLists, libraries, routeNames, resources: main['resources'] } )

        let skills = {}
        let skillMessages = []

        if( main['skills'] ) {
            const schemaDir = dirname( filePath )

            const { status: skillLoadStatus, skills: loadedSkills, messages: loadMessages } = await SkillLoader
                .load( { skillDefinitions: main['skills'], schemaDir } )

            if( !skillLoadStatus ) {
                return Pipeline.#buildResult( {
                    status: false,
                    messages: loadMessages,
                    main,
                    handlerMap,
                    sharedLists,
                    libraries,
                    warnings
                } )
            }

            const toolNames = Object.keys( toolsObj )
            const resourceNames = Object.keys( main['resources'] || {} )

            const { status: skillValidStatus, messages: skillValidMessages } = SkillValidator
                .validate( { skills: loadedSkills, tools: toolNames, resources: resourceNames } )

            if( !skillValidStatus ) {
                return Pipeline.#buildResult( {
                    status: false,
                    messages: skillValidMessages,
                    main,
                    handlerMap,
                    sharedLists,
                    libraries,
                    warnings
                } )
            }

            skills = loadedSkills
            skillMessages = skillValidMessages
        }

        let resourceValidationMessages = []

        if( main['resources'] ) {
            const { status: resValidStatus, messages: resValidMessages } = ResourceValidator
                .validate( { resources: main['resources'] } )

            if( !resValidStatus ) {
                return Pipeline.#buildResult( {
                    status: false,
                    messages: resValidMessages,
                    main,
                    handlerMap,
                    sharedLists,
                    libraries,
                    warnings
                } )
            }

            resourceValidationMessages = resValidMessages
        }

        return Pipeline.#buildResult( {
            status: true,
            messages: [],
            main,
            handlerMap,
            resourceHandlerMap,
            sharedLists,
            libraries,
            skills,
            warnings
        } )
    }


    static async executeResource( { resourceDefinition, queryName, userParams, handlerMap } ) {
        const { struct } = await ResourceExecutor
            .execute( { resourceDefinition, queryName, userParams, handlerMap } )

        return { struct }
    }


    static #buildResult( {
        status = false,
        messages = [],
        main = null,
        handlerMap = {},
        resourceHandlerMap = {},
        sharedLists = {},
        libraries = {},
        skills = {},
        warnings = []
    } ) {
        const result = {
            status,
            messages,
            main,
            handlerMap,
            resourceHandlerMap,
            sharedLists,
            libraries,
            skills,
            warnings
        }

        return result
    }
}


export { Pipeline }
