import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'


class AgentManifestLoader {
    static #REQUIRED_FIELDS = [
        [ 'name', 'string' ],
        [ 'description', 'string' ],
        [ 'version', 'string' ],
        [ 'model', 'string' ],
        [ 'systemPrompt', 'string' ],
        [ 'tools', 'object' ],
        [ 'tests', 'array' ]
    ]


    static async load( { manifestPath } ) {
        const struct = { status: false, messages: [], manifest: null, prompts: [] }

        const { content, messages: readMessages } = await AgentManifestLoader
            .#readManifestFile( { manifestPath } )

        if( readMessages.length > 0 ) {
            struct[ 'messages' ] = readMessages

            return struct
        }

        const { parsed, messages: parseMessages } = AgentManifestLoader
            .#parseJson( { content, manifestPath } )

        if( parseMessages.length > 0 ) {
            struct[ 'messages' ] = parseMessages

            return struct
        }

        const { messages: fieldMessages } = AgentManifestLoader
            .#validateRequiredFields( { parsed } )

        if( fieldMessages.length > 0 ) {
            struct[ 'messages' ] = fieldMessages

            return struct
        }

        const { manifest } = AgentManifestLoader
            .#extractManifest( { parsed } )

        struct[ 'manifest' ] = manifest

        const { prompts: promptPaths } = parsed
        if( promptPaths !== undefined && Array.isArray( promptPaths ) && promptPaths.length > 0 ) {
            const manifestDir = dirname( manifestPath )
            const { status: promptStatus, messages: promptMessages, prompts } = await AgentManifestLoader
                .loadPrompts( { promptPaths, manifestDir } )

            if( !promptStatus ) {
                struct[ 'messages' ] = promptMessages

                return struct
            }

            struct[ 'prompts' ] = prompts
        }

        struct[ 'status' ] = true

        return struct
    }


    static async loadPrompts( { promptPaths, manifestDir } ) {
        const struct = { status: false, messages: [], prompts: [] }
        const prompts = []
        const messages = []

        const results = await Promise.allSettled(
            promptPaths
                .map( ( promptPath ) => {
                    const absolutePath = join( manifestDir, promptPath )
                    const result = AgentManifestLoader
                        .#loadSinglePrompt( { absolutePath, promptPath } )

                    return result
                } )
        )

        results
            .forEach( ( result, index ) => {
                const promptPath = promptPaths[ index ]

                if( result.status === 'rejected' ) {
                    messages.push( `prompt "${promptPath}": ${result.reason.message}` )

                    return
                }

                prompts.push( result.value )
            } )

        if( messages.length > 0 ) {
            struct[ 'messages' ] = messages

            return struct
        }

        struct[ 'status' ] = true
        struct[ 'prompts' ] = prompts

        return struct
    }


    static async #readManifestFile( { manifestPath } ) {
        const messages = []
        let content = null

        try {
            content = await readFile( manifestPath, 'utf-8' )
        } catch( error ) {
            messages.push( `manifest: File not found at "${manifestPath}"` )
        }

        return { content, messages }
    }


    static #parseJson( { content, manifestPath } ) {
        const messages = []
        let parsed = null

        try {
            parsed = JSON.parse( content )
        } catch( error ) {
            messages.push( `manifest: Invalid JSON in "${manifestPath}" — ${error.message}` )
        }

        return { parsed, messages }
    }


    static #validateRequiredFields( { parsed } ) {
        const messages = []

        AgentManifestLoader.#REQUIRED_FIELDS
            .forEach( ( [ fieldName, fieldType ] ) => {
                const value = parsed[ fieldName ]

                if( value === undefined ) {
                    messages.push( `manifest.${fieldName}: Required field is missing` )
                } else if( fieldType === 'array' && !Array.isArray( value ) ) {
                    messages.push( `manifest.${fieldName}: Must be an array` )
                } else if( fieldType === 'object' && ( typeof value !== 'object' || value === null || Array.isArray( value ) ) ) {
                    messages.push( `manifest.${fieldName}: Must be a plain object` )
                } else if( fieldType === 'string' && typeof value !== 'string' ) {
                    messages.push( `manifest.${fieldName}: Must be a string` )
                } else if( fieldType === 'string' && value.length === 0 ) {
                    messages.push( `manifest.${fieldName}: Must not be empty` )
                } else if( fieldType === 'array' && value.length === 0 ) {
                    messages.push( `manifest.${fieldName}: Must not be empty` )
                } else if( fieldType === 'object' && Object.keys( value ).length === 0 ) {
                    messages.push( `manifest.${fieldName}: Must not be empty` )
                }
            } )

        return { messages }
    }


    static #extractManifest( { parsed } ) {
        const {
            name,
            description,
            version,
            model,
            systemPrompt,
            tools,
            tests,
            maxRounds,
            maxTokens,
            prompts,
            sharedLists,
            inputSchema,
            hash
        } = parsed

        const manifest = {
            name,
            description,
            version,
            model,
            systemPrompt,
            tools,
            tests,
            maxRounds: maxRounds !== undefined ? maxRounds : 10,
            maxTokens: maxTokens !== undefined ? maxTokens : 4096
        }

        if( prompts !== undefined ) { manifest[ 'prompts' ] = prompts }
        if( sharedLists !== undefined ) { manifest[ 'sharedLists' ] = sharedLists }
        if( inputSchema !== undefined ) { manifest[ 'inputSchema' ] = inputSchema }
        if( hash !== undefined ) { manifest[ 'hash' ] = hash }

        return { manifest }
    }


    static async #loadSinglePrompt( { absolutePath, promptPath } ) {
        const fileUrl = pathToFileURL( absolutePath ).href
        const module = await import( fileUrl )
        const prompt = module[ 'prompt' ] || null

        if( prompt === null ) {
            throw new Error( `Missing "prompt" export in "${promptPath}"` )
        }

        return { path: promptPath, prompt }
    }
}


export { AgentManifestLoader }
