import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'


class PromptLoader {
    static async load( { promptDir, type } ) {
        const messages = []
        const prompts = {}

        let files = []

        try {
            const entries = await readdir( promptDir )
            files = entries
                .filter( ( entry ) => {
                    const isMjs = entry.endsWith( '.mjs' )

                    return isMjs
                } )
        } catch( err ) {
            messages.push( `Failed to read prompt directory: ${err.message}` )
            const status = false

            return { status, messages, prompts }
        }

        const results = await Promise.allSettled(
            files
                .map( ( file ) => {
                    const result = PromptLoader.#loadSingle( { file, promptDir, type } )

                    return result
                } )
        )

        results
            .forEach( ( result, index ) => {
                const fileName = files[ index ]

                if( result.status === 'rejected' ) {
                    messages.push( `prompt "${fileName}": ${result.reason.message}` )

                    return
                }

                const { prompt, placeholders } = result.value
                const name = prompt[ 'name' ]
                prompts[ name ] = { ...prompt, placeholders }
            } )

        const status = messages.length === 0

        return { status, messages, prompts }
    }


    static extractPlaceholders( { content } ) {
        const references = []
        const parameters = []
        const pattern = /\[\[([^\]]+)\]\]/g
        let match = pattern.exec( content )

        while( match !== null ) {
            const [ , value ] = match

            if( value.includes( '/' ) ) {
                references.push( value )
            } else {
                parameters.push( value )
            }

            match = pattern.exec( content )
        }

        return { references, parameters }
    }


    static validate( { prompt, type } ) {
        const messages = []
        const name = prompt[ 'name' ]
        const prefix = name !== undefined && name !== null
            ? `prompt "${name}"`
            : 'prompt'

        PromptLoader.#validateRequiredFields( { prompt, prefix, messages } )
        PromptLoader.#validateTypeSpecificFields( { prompt, type, prefix, messages } )

        const status = messages.length === 0

        return { status, messages }
    }


    static async #loadSingle( { file, promptDir, type } ) {
        const absolutePath = join( promptDir, file )
        const fileUrl = pathToFileURL( absolutePath ).href
        const module = await import( fileUrl )
        const prompt = module[ 'prompt' ] || null

        if( prompt === null ) {
            throw new Error( 'Missing "prompt" export' )
        }

        const { status, messages } = PromptLoader.validate( { prompt, type } )

        if( !status ) {
            throw new Error( messages.join( '; ' ) )
        }

        const content = prompt[ 'content' ] || ''
        const { references, parameters } = PromptLoader.extractPlaceholders( { content } )
        const placeholders = { references, parameters }

        return { prompt, placeholders }
    }


    static #validateRequiredFields( { prompt, prefix, messages } ) {
        const namePattern = /^[a-z][a-z0-9-]*$/

        if( prompt[ 'name' ] === undefined || prompt[ 'name' ] === null ) {
            messages.push( `PLD001: ${prefix}.name: Missing required field` )
        } else if( typeof prompt[ 'name' ] !== 'string' ) {
            messages.push( `PLD001: ${prefix}.name: Must be type "string"` )
        } else if( !namePattern.test( prompt[ 'name' ] ) ) {
            messages.push( `PLD001: ${prefix}.name: Must match pattern /^[a-z][a-z0-9-]*$/, got "${prompt[ 'name' ]}"` )
        }

        if( prompt[ 'version' ] === undefined || prompt[ 'version' ] === null ) {
            messages.push( `PLD002: ${prefix}.version: Missing required field` )
        } else if( prompt[ 'version' ] !== 'flowmcp-prompt/1.0.0' ) {
            messages.push( `PLD002: ${prefix}.version: Must be "flowmcp-prompt/1.0.0", got "${prompt[ 'version' ]}"` )
        }

        if( prompt[ 'description' ] === undefined || prompt[ 'description' ] === null ) {
            messages.push( `PLD003: ${prefix}.description: Missing required field` )
        } else if( typeof prompt[ 'description' ] !== 'string' ) {
            messages.push( `PLD003: ${prefix}.description: Must be type "string"` )
        } else if( prompt[ 'description' ].length > 1024 ) {
            messages.push( `PLD003: ${prefix}.description: Must be at most 1024 characters, got ${prompt[ 'description' ].length}` )
        }

        if( prompt[ 'content' ] === undefined || prompt[ 'content' ] === null ) {
            messages.push( `PLD004: ${prefix}.content: Missing required field` )
        } else if( typeof prompt[ 'content' ] !== 'string' ) {
            messages.push( `PLD004: ${prefix}.content: Must be type "string"` )
        } else if( prompt[ 'content' ].trim().length === 0 ) {
            messages.push( `PLD004: ${prefix}.content: Must not be empty` )
        }
    }


    static #validateTypeSpecificFields( { prompt, type, prefix, messages } ) {
        if( type === 'provider' ) {
            if( prompt[ 'namespace' ] === undefined || prompt[ 'namespace' ] === null ) {
                messages.push( `PLD005: ${prefix}.namespace: Missing required field for provider-prompt` )
            } else if( typeof prompt[ 'namespace' ] !== 'string' ) {
                messages.push( `PLD005: ${prefix}.namespace: Must be type "string"` )
            }

            if( prompt[ 'agent' ] !== undefined ) {
                messages.push( `PLD008: ${prefix}.agent: Forbidden field for provider-prompt` )
            }

            if( prompt[ 'testedWith' ] !== undefined ) {
                messages.push( `PLD009: ${prefix}.testedWith: Forbidden field for provider-prompt` )
            }
        }

        if( type === 'agent' ) {
            if( prompt[ 'agent' ] === undefined || prompt[ 'agent' ] === null ) {
                messages.push( `PLD006: ${prefix}.agent: Missing required field for agent-prompt` )
            } else if( typeof prompt[ 'agent' ] !== 'string' ) {
                messages.push( `PLD006: ${prefix}.agent: Must be type "string"` )
            }

            if( prompt[ 'testedWith' ] === undefined || prompt[ 'testedWith' ] === null ) {
                messages.push( `PLD007: ${prefix}.testedWith: Missing required field for agent-prompt` )
            } else if( typeof prompt[ 'testedWith' ] !== 'string' ) {
                messages.push( `PLD007: ${prefix}.testedWith: Must be type "string"` )
            } else if( !prompt[ 'testedWith' ].includes( '/' ) ) {
                messages.push( `PLD010: ${prefix}.testedWith: Must contain "/" (OpenRouter format), got "${prompt[ 'testedWith' ]}"` )
            }

            if( prompt[ 'namespace' ] !== undefined ) {
                messages.push( `PLD005: ${prefix}.namespace: Forbidden field for agent-prompt` )
            }
        }
    }
}


export { PromptLoader }
