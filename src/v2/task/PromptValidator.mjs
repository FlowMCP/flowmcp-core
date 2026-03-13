class PromptValidator {
    static validate( { prompts, namespace } ) {
        const struct = { status: false, messages: [], warnings: [] }

        if( typeof prompts !== 'object' || prompts === null || Array.isArray( prompts ) ) {
            struct['messages'].push( 'PRM001: main.prompts: Must be a non-null object' )

            return struct
        }

        const entries = Object.entries( prompts )

        if( entries.length === 0 ) {
            struct['messages'].push( 'PRM001: main.prompts: Must contain at least one prompt' )

            return struct
        }

        if( entries.length > 5 ) {
            struct['messages'].push( 'PRM002: main.prompts: Maximum 5 prompts per schema' )

            return struct
        }

        const keyPattern = /^[a-z][a-zA-Z0-9]*$/
        const hasAbout = entries
            .find( ( [ key ] ) => {
                const isAbout = key === 'about'

                return isAbout
            } )

        if( !hasAbout ) {
            struct['warnings'].push( 'PRM-WARN: main.prompts: Missing recommended "about" prompt' )
        }

        entries
            .forEach( ( [ key, prompt ] ) => {
                if( !keyPattern.test( key ) ) {
                    struct['messages'].push( `PRM003: prompts.${key}: Key must match /^[a-z][a-zA-Z0-9]*$/ (camelCase)` )
                }

                if( typeof prompt !== 'object' || prompt === null ) {
                    struct['messages'].push( `PRM003: prompts.${key}: Must be an object` )

                    return
                }

                PromptValidator.#validateSingle( { key, prompt, namespace, messages: struct['messages'] } )
            } )

        struct['status'] = struct['messages'].length === 0

        return struct
    }


    static #validateSingle( { key, prompt, namespace, messages } ) {
        PromptValidator.#validateName( { key, prompt, messages } )
        PromptValidator.#validateVersion( { key, prompt, messages } )
        PromptValidator.#validateNamespace( { key, prompt, namespace, messages } )
        PromptValidator.#validateDescription( { key, prompt, messages } )
        PromptValidator.#validateDependsOn( { key, prompt, messages } )
        PromptValidator.#validateReferences( { key, prompt, messages } )
        PromptValidator.#validateContentFile( { key, prompt, messages } )
        PromptValidator.#validateForbiddenFields( { key, prompt, messages } )
    }


    static #validateName( { key, prompt, messages } ) {
        const namePattern = /^[a-z][a-z0-9-]*$/

        if( prompt['name'] === undefined || prompt['name'] === null ) {
            messages.push( `PRM001: prompts.${key}.name: Missing required field` )
        } else if( typeof prompt['name'] !== 'string' ) {
            messages.push( `PRM001: prompts.${key}.name: Must be type "string"` )
        } else if( !namePattern.test( prompt['name'] ) ) {
            messages.push( `PRM001: prompts.${key}.name: Must match /^[a-z][a-z0-9-]*$/, got "${prompt['name']}"` )
        }
    }


    static #validateVersion( { key, prompt, messages } ) {
        if( prompt['version'] === undefined || prompt['version'] === null ) {
            messages.push( `PRM002: prompts.${key}.version: Missing required field` )
        } else if( typeof prompt['version'] !== 'string' ) {
            messages.push( `PRM002: prompts.${key}.version: Must be type "string"` )
        } else if( prompt['version'] !== 'flowmcp-prompt/1.0.0' ) {
            messages.push( `PRM002: prompts.${key}.version: Must be "flowmcp-prompt/1.0.0", got "${prompt['version']}"` )
        }
    }


    static #validateNamespace( { key, prompt, namespace, messages } ) {
        if( prompt['namespace'] === undefined || prompt['namespace'] === null ) {
            messages.push( `PRM003: prompts.${key}.namespace: Missing required field` )
        } else if( typeof prompt['namespace'] !== 'string' ) {
            messages.push( `PRM003: prompts.${key}.namespace: Must be type "string"` )
        } else if( namespace && prompt['namespace'] !== namespace ) {
            messages.push( `PRM003: prompts.${key}.namespace: Must match schema namespace "${namespace}", got "${prompt['namespace']}"` )
        }
    }


    static #validateDescription( { key, prompt, messages } ) {
        if( prompt['description'] === undefined || prompt['description'] === null ) {
            messages.push( `PRM004: prompts.${key}.description: Missing required field` )
        } else if( typeof prompt['description'] !== 'string' ) {
            messages.push( `PRM004: prompts.${key}.description: Must be type "string"` )
        } else if( prompt['description'].length === 0 ) {
            messages.push( `PRM004: prompts.${key}.description: Must not be empty` )
        } else if( prompt['description'].length > 1024 ) {
            messages.push( `PRM004: prompts.${key}.description: Must be at most 1024 characters` )
        }
    }


    static #validateDependsOn( { key, prompt, messages } ) {
        if( prompt['dependsOn'] === undefined || prompt['dependsOn'] === null ) {
            messages.push( `PRM005: prompts.${key}.dependsOn: Missing required field` )
        } else if( !Array.isArray( prompt['dependsOn'] ) ) {
            messages.push( `PRM005: prompts.${key}.dependsOn: Must be an array` )
        } else {
            prompt['dependsOn']
                .forEach( ( entry, index ) => {
                    if( typeof entry !== 'string' ) {
                        messages.push( `PRM005: prompts.${key}.dependsOn[${index}]: Must be type "string"` )
                    }
                } )
        }
    }


    static #validateReferences( { key, prompt, messages } ) {
        if( prompt['references'] === undefined || prompt['references'] === null ) {
            messages.push( `PRM013: prompts.${key}.references: Missing required field` )
        } else if( !Array.isArray( prompt['references'] ) ) {
            messages.push( `PRM013: prompts.${key}.references: Must be an array` )
        } else {
            prompt['references']
                .forEach( ( entry, index ) => {
                    if( typeof entry !== 'string' ) {
                        messages.push( `PRM013: prompts.${key}.references[${index}]: Must be type "string"` )
                    }
                } )
        }
    }


    static #validateContentFile( { key, prompt, messages } ) {
        if( prompt['contentFile'] === undefined || prompt['contentFile'] === null ) {
            messages.push( `PRM011: prompts.${key}.contentFile: Missing required field` )
        } else if( typeof prompt['contentFile'] !== 'string' ) {
            messages.push( `PRM011: prompts.${key}.contentFile: Must be type "string"` )
        } else if( !prompt['contentFile'].endsWith( '.mjs' ) ) {
            messages.push( `PRM011: prompts.${key}.contentFile: Must end with ".mjs", got "${prompt['contentFile']}"` )
        }
    }


    static #validateForbiddenFields( { key, prompt, messages } ) {
        if( prompt['agent'] !== undefined ) {
            messages.push( `PRM003: prompts.${key}.agent: Forbidden field for provider-prompt` )
        }

        if( prompt['testedWith'] !== undefined ) {
            messages.push( `PRM004: prompts.${key}.testedWith: Forbidden field for provider-prompt` )
        }

        if( prompt['content'] !== undefined ) {
            messages.push( `PRM010: prompts.${key}.content: Forbidden field for provider-prompt (use contentFile instead)` )
        }
    }
}


export { PromptValidator }
