class PromptValidator {
    static validate( { prompts } ) {
        const struct = { status: false, messages: [] }

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

        const namePattern = /^[a-z][a-zA-Z0-9]*$/

        entries
            .forEach( ( [ key, prompt ] ) => {
                if( !namePattern.test( key ) ) {
                    struct['messages'].push( `PRM003: prompts.${key}: Key must match /^[a-z][a-zA-Z0-9]*$/ (camelCase)` )
                }

                if( typeof prompt !== 'object' || prompt === null ) {
                    struct['messages'].push( `PRM003: prompts.${key}: Must be an object` )

                    return
                }

                PromptValidator.#validateSingle( { key, prompt, messages: struct['messages'] } )
            } )

        struct['status'] = struct['messages'].length === 0

        return struct
    }


    static #validateSingle( { key, prompt, messages } ) {
        const namePattern = /^[a-z][a-z0-9-]*$/

        if( prompt['name'] === undefined || prompt['name'] === null ) {
            messages.push( `PRM003: prompts.${key}.name: Missing required field` )
        } else if( typeof prompt['name'] !== 'string' ) {
            messages.push( `PRM003: prompts.${key}.name: Must be type "string"` )
        } else if( !namePattern.test( prompt['name'] ) ) {
            messages.push( `PRM003: prompts.${key}.name: Must match /^[a-z][a-z0-9-]*$/, got "${prompt['name']}"` )
        }

        if( prompt['description'] === undefined || prompt['description'] === null ) {
            messages.push( `PRM004: prompts.${key}.description: Missing required field` )
        } else if( typeof prompt['description'] !== 'string' ) {
            messages.push( `PRM004: prompts.${key}.description: Must be type "string"` )
        } else if( prompt['description'].length === 0 ) {
            messages.push( `PRM004: prompts.${key}.description: Must not be empty` )
        } else if( prompt['description'].length > 1024 ) {
            messages.push( `PRM004: prompts.${key}.description: Must be at most 1024 characters` )
        }

        if( prompt['content'] === undefined || prompt['content'] === null ) {
            messages.push( `PRM005: prompts.${key}.content: Missing required field` )
        } else if( typeof prompt['content'] !== 'string' ) {
            messages.push( `PRM005: prompts.${key}.content: Must be type "string"` )
        } else if( prompt['content'].trim().length === 0 ) {
            messages.push( `PRM005: prompts.${key}.content: Must not be empty` )
        }

        if( prompt['parameters'] !== undefined ) {
            if( !Array.isArray( prompt['parameters'] ) ) {
                messages.push( `PRM006: prompts.${key}.parameters: Must be an array` )
            } else {
                prompt['parameters']
                    .forEach( ( param, index ) => {
                        if( typeof param !== 'object' || param === null ) {
                            messages.push( `PRM007: prompts.${key}.parameters[${index}]: Must be an object` )

                            return
                        }

                        if( !param['name'] || typeof param['name'] !== 'string' ) {
                            messages.push( `PRM007: prompts.${key}.parameters[${index}].name: Missing or invalid` )
                        }

                        if( param['description'] !== undefined && typeof param['description'] !== 'string' ) {
                            messages.push( `PRM007: prompts.${key}.parameters[${index}].description: Must be type "string"` )
                        }

                        if( param['required'] !== undefined && typeof param['required'] !== 'boolean' ) {
                            messages.push( `PRM007: prompts.${key}.parameters[${index}].required: Must be type "boolean"` )
                        }
                    } )
            }
        }
    }
}


export { PromptValidator }
