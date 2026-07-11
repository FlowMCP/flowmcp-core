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

import { SecurityScanner } from './SecurityScanner.mjs'
import { SchemaLoader } from './SchemaLoader.mjs'
import { MainValidator } from './MainValidator.mjs'
import { SharedListResolver } from './SharedListResolver.mjs'
import { LibraryLoader } from './LibraryLoader.mjs'
import { SelectionLoader } from './SelectionLoader.mjs'
import { SelectionValidator } from './SelectionValidator.mjs'
import { HandlerFactory } from './HandlerFactory.mjs'
import { SkillLoader } from './SkillLoader.mjs'
import { SkillValidator } from './SkillValidator.mjs'
import { SkillContentGenerator } from './SkillContentGenerator.mjs'
import { PrefillExecutor } from './PrefillExecutor.mjs'
import { PlaceholderResolver } from './PlaceholderResolver.mjs'
import { ResourceValidator } from './ResourceValidator.mjs'
import { ResourceDatabaseManager } from './ResourceDatabaseManager.mjs'
import { PromptValidator } from './PromptValidator.mjs'
import { PromptLoader } from './PromptLoader.mjs'
import { ResourceExecutor } from './ResourceExecutor.mjs'

import { dirname } from 'node:path'


class Pipeline {
    static async load( {
        filePath,
        listsDir,
        allowlist,
        resolveBase,
        resolveBases,
        libraries: injectedLibraries,
        selectionFiles,
        prefillTimeout,
        fetchFn,
        userParams,
        skipScan = false,
        stages,
        strict = false,
        bustCache = false
    } ) {
        const warnings = []

        // CLI<->core load contract (Memo 152 / PRD-008, B-08). Every switch is an
        // explicit, documented option — no hidden defaults:
        //   stages    — per-stage toggles (scan/skills/prefill/resources/selections),
        //               each defaults to ON; Light-Mode passes them OFF.
        //   skipScan  — the single scan switch (PRD-007); skipScan:true == scan OFF.
        //   strict    — fail-loud coded errors (LST-001/HND-001/LIB-001) instead of
        //               silent PIPE-WARN degradation (F17=A / Memo 149).
        //   bustCache — force a fresh module import of the schema file.
        //   resolveBases[] / libraries — Memo-150 ordered library resolution or a
        //               pre-resolved injection (core stays env-free).
        const effectiveStages = Pipeline.#resolveStages( { stages, skipScan } )

        // Schritt 1: SecurityScanner (trusted loads skip the scan; default = scan on)
        if( effectiveStages.scan ) {
            const { status: scanStatus, messages: scanMessages } = await SecurityScanner
                .scan( { filePath } )

            if( !scanStatus ) {
                return Pipeline.#buildResult( {
                    status: false,
                    messages: scanMessages,
                    warnings
                } )
            }
        }

        // Schritt 2: SchemaLoader
        const loaded = await SchemaLoader
            .load( { filePath, bustCache } )

        if( loaded[ 'messages' ] && loaded[ 'messages' ].length > 0 ) {
            loaded[ 'messages' ]
                .forEach( ( msg ) => { warnings.push( msg ) } )
        }

        // Schritt 3: extract main + handlers (v4-only — no legacy shape adaptation)
        const main = loaded[ 'main' ]
        const handlersFn = loaded[ 'handlersFn' ]

        // Schritt 4: MainValidator v4
        const { status: validStatus, messages: validMessages, warnings: validWarnings } = MainValidator
            .validate( { main } )

        if( Array.isArray( validWarnings ) ) {
            validWarnings
                .forEach( ( w ) => { warnings.push( w ) } )
        }

        if( !validStatus ) {
            return Pipeline.#buildResult( {
                status: false,
                messages: validMessages,
                main,
                warnings
            } )
        }

        // Schritt 5: SharedListResolver
        const sharedLists = await Pipeline.#loadSharedLists( { main, listsDir, warnings, strict } )

        // Schritt 6: LibraryLoader
        const libraries = await Pipeline.#loadLibraries( {
            main,
            allowlist,
            resolveBase,
            resolveBases,
            injectedLibraries,
            strict
        } )

        const toolsObj = main[ 'tools' ] || {}

        // Schritt 7: SelectionLoader (optional — only if selectionFiles provided)
        const { selections, selectionMessages } = effectiveStages.selections
            ? await Pipeline.#loadSelections( { selectionFiles, warnings } )
            : { selections: {}, selectionMessages: [] }

        if( selectionMessages.length > 0 ) {
            return Pipeline.#buildResult( {
                status: false,
                messages: selectionMessages,
                main,
                sharedLists,
                libraries,
                warnings
            } )
        }

        // Schritt 8: SelectionValidator
        const { status: selValidStatus, messages: selValidMessages } = Pipeline.#validateSelections( {
            selections
        } )

        if( !selValidStatus ) {
            return Pipeline.#buildResult( {
                status: false,
                messages: selValidMessages,
                main,
                sharedLists,
                libraries,
                warnings
            } )
        }

        // Schritt 9: HandlerFactory (strict wraps a factory error as HND-001)
        const routeNames = Object.keys( toolsObj )
        const { handlerMap, resourceHandlerMap } = Pipeline.#createHandlers( {
            handlersFn,
            sharedLists,
            libraries,
            routeNames,
            resources: main[ 'resources' ],
            strict
        } )

        // Schritt 10-13: Skills stage (SkillLoader/-Validator, content, prefill,
        // placeholder resolution). Light-Mode skips it entirely.
        let skills = {}
        let contentMap = null
        let prefillResults = new Map()
        let resolvedSkills = {}

        if( effectiveStages.skills ) {
            const {
                status: skillStatus,
                messages: skillMessages,
                skills: loadedSkills
            } = await Pipeline.#loadAndValidateSkills( {
                main,
                filePath,
                toolsObj,
                warnings
            } )

            if( !skillStatus ) {
                return Pipeline.#buildResult( {
                    status: false,
                    messages: skillMessages,
                    main,
                    handlerMap,
                    resourceHandlerMap,
                    sharedLists,
                    libraries,
                    warnings
                } )
            }

            skills = loadedSkills

            const generated = SkillContentGenerator
                .generate( { schemas: [ main ], sharedLists } )
            contentMap = generated[ 'contentMap' ]

            if( effectiveStages.prefill ) {
                prefillResults = await Pipeline.#runPrefill( {
                    skills,
                    userParams,
                    fetchFn,
                    prefillTimeout,
                    warnings
                } )
            }

            const catalog = Pipeline.#buildCatalog( { main, skills, contentMap } )

            resolvedSkills = Pipeline.#resolveSkillContents( {
                skills,
                catalog,
                sharedLists,
                userParams,
                prefillResults
            } )
        }

        // Schritt 14: ResourceValidator + ResourceDatabaseManager v4
        if( effectiveStages.resources ) {
            const { status: resStatus, messages: resMessages } = await Pipeline.#initializeResources( {
                main,
                filePath,
                warnings
            } )

            if( !resStatus ) {
                return Pipeline.#buildResult( {
                    status: false,
                    messages: resMessages,
                    main,
                    handlerMap,
                    resourceHandlerMap,
                    sharedLists,
                    libraries,
                    skills: resolvedSkills,
                    selections,
                    warnings
                } )
            }
        }

        // Schritt 15: PromptValidator + PromptLoader
        const {
            status: promptStatus,
            messages: promptMessages,
            prompts
        } = await Pipeline.#loadPrompts( { main, filePath, warnings } )

        if( !promptStatus ) {
            return Pipeline.#buildResult( {
                status: false,
                messages: promptMessages,
                main,
                handlerMap,
                resourceHandlerMap,
                sharedLists,
                libraries,
                skills: resolvedSkills,
                selections,
                warnings
            } )
        }

        // Schritt 16: Return
        return Pipeline.#buildResult( {
            status: true,
            messages: [],
            main,
            handlerMap,
            resourceHandlerMap,
            sharedLists,
            libraries,
            skills: resolvedSkills,
            selections,
            prompts,
            contentMap,
            prefillResults,
            warnings
        } )
    }


    static #resolveStages( { stages, skipScan } ) {
        const provided = stages === undefined || stages === null ? {} : stages
        const flag = ( key ) => provided[ key ] === undefined ? true : provided[ key ] === true

        // skipScan is the single scan switch: skipScan:true forces the scan stage off,
        // otherwise the explicit stages.scan toggle (default on) decides.
        const scan = skipScan === true ? false : flag( 'scan' )

        return {
            scan,
            skills: flag( 'skills' ),
            prefill: flag( 'prefill' ),
            resources: flag( 'resources' ),
            selections: flag( 'selections' )
        }
    }


    static #createHandlers( { handlersFn, sharedLists, libraries, routeNames, resources, strict } ) {
        try {
            const { handlerMap, resourceHandlerMap } = HandlerFactory
                .create( { handlersFn, sharedLists, libraries, routeNames, resources } )

            return { handlerMap, resourceHandlerMap }
        } catch( err ) {
            if( strict ) {
                throw new Error( `HND-001: ${err.message}` )
            }

            throw err
        }
    }


    static async executeResource( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } ) {
        const { struct } = await ResourceExecutor
            .execute( { resourceDefinition, resourceName, queryName, userParams, handlerMap, schemaRef } )

        return { struct }
    }


    static async #loadSharedLists( { main, listsDir, warnings, strict } ) {
        const sharedListRefs = main[ 'sharedLists' ]

        if( sharedListRefs !== undefined && sharedListRefs !== null && !Array.isArray( sharedListRefs ) ) {
            warnings.push( 'PIPE-WARN: main.sharedLists exists but is not an array' )
        }

        const effectiveRefs = Array.isArray( sharedListRefs ) ? sharedListRefs : []

        if( effectiveRefs.length === 0 ) {
            return {}
        }

        if( !listsDir ) {
            if( strict ) {
                throw new Error( 'LST-001: Schema declares sharedLists but no listsDir was provided' )
            }

            warnings.push( 'PIPE-WARN: Schema declares sharedLists but no listsDir was provided — lists will NOT be loaded' )
            return {}
        }

        try {
            const resolved = await SharedListResolver
                .resolve( { sharedListRefs: effectiveRefs, listsDir } )

            return resolved[ 'sharedLists' ]
        } catch( err ) {
            if( strict ) {
                throw new Error( `LST-001: Unresolvable sharedLists reference — ${err.message}` )
            }

            throw err
        }
    }


    static async #loadLibraries( { main, allowlist, resolveBase, resolveBases, injectedLibraries, strict } ) {
        const rawRequired = main[ 'requiredLibraries' ]
        const effectiveRequired = Array.isArray( rawRequired ) ? rawRequired : []

        if( effectiveRequired.length === 0 ) {
            return {}
        }

        // Injected, pre-resolved libraries (B-08b) bypass resolution entirely.
        if( injectedLibraries !== undefined && injectedLibraries !== null ) {
            return injectedLibraries
        }

        // No-Silent-Default (F17=A): the silent allowlist-degradation PIPE-WARN is
        // gone. An unresolvable required library fails loud (LIB-001 in strict mode,
        // the raw LibraryLoader error otherwise).
        try {
            const loaded = await LibraryLoader
                .load( { requiredLibraries: effectiveRequired, allowlist, resolveBase, resolveBases } )

            return loaded[ 'libraries' ]
        } catch( err ) {
            if( strict ) {
                throw new Error( `LIB-001: ${err.message}` )
            }

            throw err
        }
    }


    static async #loadSelections( { selectionFiles, warnings } ) {
        const messages = []
        const selections = {}

        if( !Array.isArray( selectionFiles ) || selectionFiles.length === 0 ) {
            return { selections, selectionMessages: messages }
        }

        const tasks = selectionFiles
            .map( async ( file ) => {
                try {
                    const { selection } = await SelectionLoader
                        .load( { filePath: file } )

                    const key = selection !== undefined && selection !== null
                        ? selection[ 'namespace' ]
                        : null

                    if( key === undefined || key === null || typeof key !== 'string' || key.length === 0 ) {
                        messages.push( `SEL-LOAD: Selection at '${file}' has no namespace key` )
                        return
                    }

                    selections[ key ] = selection
                } catch( err ) {
                    messages.push( `SEL-LOAD: Failed to load selection at '${file}' — ${err.message}` )
                }
            } )

        await Promise.all( tasks )

        if( messages.length === 0 ) {
            warnings.push( `PIPE-INFO: Loaded ${Object.keys( selections ).length} selection(s)` )
        }

        return { selections, selectionMessages: messages }
    }


    static #validateSelections( { selections } ) {
        const messages = []

        const entries = Object.entries( selections )

        entries
            .forEach( ( [ key, selection ] ) => {
                const { valid, errors } = SelectionValidator
                    .validate( { selection } )

                if( !valid ) {
                    errors
                        .forEach( ( e ) => { messages.push( `selection "${key}": ${e}` ) } )
                }
            } )

        const status = messages.length === 0

        return { status, messages }
    }


    static async #loadAndValidateSkills( { main, filePath, toolsObj, warnings } ) {
        const skillDefinitions = main[ 'skills' ]

        if( skillDefinitions === undefined || skillDefinitions === null ) {
            return { status: true, messages: [], skills: {} }
        }

        const schemaDir = dirname( filePath )

        const {
            status: loadStatus,
            skills: loadedSkills,
            messages: loadMessages
        } = await SkillLoader
            .load( { skillDefinitions, schemaDir } )

        if( !loadStatus ) {
            return { status: false, messages: loadMessages, skills: {} }
        }

        const toolNames = Object.keys( toolsObj )
        const resourceNames = Object.keys( main[ 'resources' ] || {} )

        const { status: validStatus, messages: validMessages } = SkillValidator
            .validate( {
                skills: loadedSkills,
                tools: toolNames,
                resources: resourceNames
            } )

        if( !validStatus ) {
            return { status: false, messages: validMessages, skills: {} }
        }

        return { status: true, messages: [], skills: loadedSkills }
    }


    static async #runPrefill( { skills, userParams, fetchFn, prefillTimeout, warnings } ) {
        const merged = new Map()
        const skillEntries = Object.entries( skills )

        if( skillEntries.length === 0 ) {
            return merged
        }

        if( typeof fetchFn !== 'function' || prefillTimeout === undefined || prefillTimeout === null ) {
            const hasPrefill = skillEntries.some( ( [ , skill ] ) => Array.isArray( skill[ 'prefill' ] ) && skill[ 'prefill' ].length > 0 )

            if( hasPrefill ) {
                warnings.push( 'PIPE-WARN: Skills declare prefill but fetchFn/prefillTimeout missing — skipping prefill' )
            }

            return merged
        }

        const params = userParams === undefined || userParams === null ? {} : userParams

        const tasks = skillEntries
            .map( async ( [ skillName, skill ] ) => {
                const { prefillResults } = await PrefillExecutor
                    .execute( {
                        skill,
                        userParams: params,
                        fetchFn,
                        timeout: prefillTimeout
                    } )

                prefillResults
                    .forEach( ( value, key ) => {
                        merged.set( `${skillName}:${key}`, value )
                    } )
            } )

        await Promise.all( tasks )

        return merged
    }


    static #buildCatalog( { main, skills, contentMap } ) {
        const namespace = main[ 'namespace' ] || null

        const tools = new Map()
        Object.entries( main[ 'tools' ] || {} )
            .forEach( ( [ name, def ] ) => {
                tools.set( `${namespace}/tool/${name}`, def )
            } )

        const resources = new Map()
        Object.entries( main[ 'resources' ] || {} )
            .forEach( ( [ name, def ] ) => {
                resources.set( `${namespace}/resource/${name}`, def )
            } )

        const prompts = new Map()
        Object.entries( main[ 'prompts' ] || {} )
            .forEach( ( [ name, def ] ) => {
                prompts.set( `${namespace}/prompt/${name}`, def )
            } )

        const skillsMap = new Map()
        Object.entries( skills || {} )
            .forEach( ( [ name, def ] ) => {
                skillsMap.set( `${namespace}/skill/${name}`, def )
            } )

        return { tools, resources, prompts, skills: skillsMap, contentMap }
    }


    static #resolveSkillContents( { skills, catalog, sharedLists, userParams, prefillResults } ) {
        const resolvedSkills = {}
        const params = userParams === undefined || userParams === null ? {} : userParams

        Object.entries( skills )
            .forEach( ( [ skillName, skill ] ) => {
                const content = skill[ 'content' ]

                if( typeof content !== 'string' || content.length === 0 ) {
                    resolvedSkills[ skillName ] = skill
                    return
                }

                const { resolved } = PlaceholderResolver
                    .resolve( {
                        content,
                        catalog,
                        sharedLists,
                        inputs: params,
                        prefillResults
                    } )

                resolvedSkills[ skillName ] = { ...skill, resolvedContent: resolved }
            } )

        return resolvedSkills
    }


    static async #initializeResources( { main, filePath, warnings } ) {
        const resources = main[ 'resources' ]

        if( resources === undefined || resources === null ) {
            return { status: true, messages: [] }
        }

        const { status: validStatus, messages: validMessages } = ResourceValidator
            .validate( { resources } )

        if( !validStatus ) {
            return { status: false, messages: validMessages }
        }

        const schemaRef = main[ 'namespace' ] || 'unknown'
        const schemaDir = dirname( filePath )

        const { status: initStatus, messages: initMessages } = await ResourceDatabaseManager
            .initialize( { resources, schemaRef, schemaDir } )

        if( !initStatus ) {
            initMessages
                .forEach( ( msg ) => { warnings.push( msg ) } )
        }

        return { status: true, messages: [] }
    }


    static async #loadPrompts( { main, filePath, warnings } ) {
        const prompts = main[ 'prompts' ]

        if( prompts === undefined || prompts === null ) {
            return { status: true, messages: [], prompts: {} }
        }

        const namespace = main[ 'namespace' ] || null

        const {
            status: validStatus,
            messages: validMessages,
            warnings: validWarnings
        } = PromptValidator
            .validate( { prompts, namespace } )

        if( Array.isArray( validWarnings ) ) {
            validWarnings
                .forEach( ( w ) => { warnings.push( w ) } )
        }

        if( !validStatus ) {
            return { status: false, messages: validMessages, prompts: {} }
        }

        const schemaDir = dirname( filePath )

        const {
            status: loadStatus,
            messages: loadMessages,
            prompts: loaded
        } = await PromptLoader
            .loadProviderPrompts( { prompts, schemaDir } )

        if( !loadStatus ) {
            return { status: false, messages: loadMessages, prompts: {} }
        }

        return { status: true, messages: [], prompts: loaded }
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
        selections = {},
        prompts = {},
        contentMap = null,
        prefillResults = null,
        warnings = []
    } ) {
        return {
            status,
            messages,
            main,
            handlerMap,
            resourceHandlerMap,
            sharedLists,
            libraries,
            skills,
            selections,
            prompts,
            contentMap,
            prefillResults,
            warnings
        }
    }
}


export { Pipeline }
