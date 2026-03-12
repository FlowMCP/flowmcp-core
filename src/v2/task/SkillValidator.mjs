class SkillValidator {
    static validate( { skills, tools, resources } ) {
        const messages = []
        const skillNames = Object.keys( skills )

        skillNames
            .forEach( ( skillName ) => {
                const skill = skills[ skillName ]
                const prefix = `skill "${skillName}"`

                SkillValidator.#validateRequiredFields( { skill, prefix, messages } )
                SkillValidator.#validateRequires( { skill, prefix, tools, resources, messages } )
                SkillValidator.#validateInput( { skill, prefix, messages } )
                SkillValidator.#validatePlaceholders( { skill, prefix, tools, resources, skillNames, messages } )
            } )

        const status = messages.length === 0

        return { status, messages }
    }


    static #validateRequiredFields( { skill, prefix, messages } ) {
        const namePattern = /^[a-z][a-z0-9-]{0,63}$/

        if( skill[ 'name' ] === undefined || skill[ 'name' ] === null ) {
            messages.push( `${prefix}.name: Missing required field` )
        } else if( typeof skill[ 'name' ] !== 'string' ) {
            messages.push( `${prefix}.name: Must be type "string"` )
        } else if( !namePattern.test( skill[ 'name' ] ) ) {
            messages.push( `${prefix}.name: Must match pattern /^[a-z][a-z0-9-]{0,63}$/, got "${skill[ 'name' ]}"` )
        }

        if( skill[ 'version' ] === undefined || skill[ 'version' ] === null ) {
            messages.push( `${prefix}.version: Missing required field` )
        } else if( skill[ 'version' ] !== 'flowmcp-skill/1.0.0' ) {
            messages.push( `${prefix}.version: Must be "flowmcp-skill/1.0.0", got "${skill[ 'version' ]}"` )
        }

        if( skill[ 'description' ] === undefined || skill[ 'description' ] === null ) {
            messages.push( `${prefix}.description: Missing required field` )
        } else if( typeof skill[ 'description' ] !== 'string' ) {
            messages.push( `${prefix}.description: Must be type "string"` )
        } else if( skill[ 'description' ].length > 1024 ) {
            messages.push( `${prefix}.description: Must be at most 1024 characters, got ${skill[ 'description' ].length}` )
        }

        if( skill[ 'content' ] === undefined || skill[ 'content' ] === null ) {
            messages.push( `${prefix}.content: Missing required field` )
        } else if( typeof skill[ 'content' ] !== 'string' ) {
            messages.push( `${prefix}.content: Must be type "string"` )
        } else if( skill[ 'content' ].trim().length === 0 ) {
            messages.push( `${prefix}.content: Must not be empty` )
        }

        if( skill[ 'output' ] === undefined || skill[ 'output' ] === null ) {
            messages.push( `${prefix}.output: Missing required field` )
        } else if( typeof skill[ 'output' ] !== 'string' ) {
            messages.push( `${prefix}.output: Must be type "string"` )
        } else if( skill[ 'output' ].trim().length === 0 ) {
            messages.push( `${prefix}.output: Must not be empty` )
        }
    }


    static #validateRequires( { skill, prefix, tools, resources, messages } ) {
        const requires = skill[ 'requires' ]

        if( requires === undefined ) {
            return
        }

        if( typeof requires !== 'object' || Array.isArray( requires ) || requires === null ) {
            messages.push( `${prefix}.requires: Must be a plain object` )

            return
        }

        if( requires[ 'tools' ] !== undefined ) {
            if( !Array.isArray( requires[ 'tools' ] ) ) {
                messages.push( `${prefix}.requires.tools: Must be an array` )
            } else {
                requires[ 'tools' ]
                    .forEach( ( toolName ) => {
                        if( !tools.includes( toolName ) ) {
                            messages.push( `${prefix}.requires.tools: Tool "${toolName}" does not exist in schema` )
                        }
                    } )
            }
        }

        if( requires[ 'resources' ] !== undefined ) {
            if( !Array.isArray( requires[ 'resources' ] ) ) {
                messages.push( `${prefix}.requires.resources: Must be an array` )
            } else {
                requires[ 'resources' ]
                    .forEach( ( resourceName ) => {
                        if( !resources.includes( resourceName ) ) {
                            messages.push( `${prefix}.requires.resources: Resource "${resourceName}" does not exist in schema` )
                        }
                    } )
            }
        }

        if( requires[ 'external' ] !== undefined ) {
            if( !Array.isArray( requires[ 'external' ] ) ) {
                messages.push( `${prefix}.requires.external: Must be an array` )
            } else {
                requires[ 'external' ]
                    .forEach( ( entry, index ) => {
                        if( typeof entry !== 'string' ) {
                            messages.push( `${prefix}.requires.external[${index}]: Must be type "string"` )
                        }
                    } )
            }
        }
    }


    static #validateInput( { skill, prefix, messages } ) {
        const input = skill[ 'input' ]

        if( input === undefined ) {
            return
        }

        if( !Array.isArray( input ) ) {
            messages.push( `${prefix}.input: Must be an array` )

            return
        }

        const allowedTypes = [ 'string', 'number', 'boolean', 'enum' ]

        input
            .forEach( ( param, index ) => {
                const paramPrefix = `${prefix}.input[${index}]`

                if( param[ 'key' ] === undefined || param[ 'key' ] === null ) {
                    messages.push( `${paramPrefix}.key: Missing required field` )
                } else if( typeof param[ 'key' ] !== 'string' ) {
                    messages.push( `${paramPrefix}.key: Must be type "string"` )
                }

                if( param[ 'type' ] === undefined || param[ 'type' ] === null ) {
                    messages.push( `${paramPrefix}.type: Missing required field` )
                } else if( !allowedTypes.includes( param[ 'type' ] ) ) {
                    messages.push( `${paramPrefix}.type: Must be one of ${allowedTypes.join( ', ' )}, got "${param[ 'type' ]}"` )
                }

                if( param[ 'description' ] === undefined || param[ 'description' ] === null ) {
                    messages.push( `${paramPrefix}.description: Missing required field` )
                } else if( typeof param[ 'description' ] !== 'string' ) {
                    messages.push( `${paramPrefix}.description: Must be type "string"` )
                } else if( param[ 'description' ].trim().length === 0 ) {
                    messages.push( `${paramPrefix}.description: Must not be empty` )
                }

                if( param[ 'required' ] === undefined || param[ 'required' ] === null ) {
                    messages.push( `${paramPrefix}.required: Missing required field` )
                } else if( typeof param[ 'required' ] !== 'boolean' ) {
                    messages.push( `${paramPrefix}.required: Must be type "boolean"` )
                }

                if( param[ 'type' ] === 'enum' ) {
                    if( param[ 'values' ] === undefined || param[ 'values' ] === null ) {
                        messages.push( `${paramPrefix}.values: Required when type is "enum"` )
                    } else if( !Array.isArray( param[ 'values' ] ) ) {
                        messages.push( `${paramPrefix}.values: Must be an array` )
                    } else if( param[ 'values' ].length === 0 ) {
                        messages.push( `${paramPrefix}.values: Must not be empty` )
                    }
                }
            } )
    }


    static #validatePlaceholders( { skill, prefix, tools, resources, skillNames, messages } ) {
        const { placeholders } = skill

        if( !placeholders || !Array.isArray( placeholders ) ) {
            return
        }

        const inputKeys = ( skill[ 'input' ] || [] )
            .map( ( param ) => {
                const key = param[ 'key' ]

                return key
            } )

        placeholders
            .forEach( ( { type, name } ) => {
                if( type === 'tool' && !tools.includes( name ) ) {
                    messages.push( `${prefix}.content: Placeholder {{tool:${name}}} references non-existent tool` )
                }

                if( type === 'resource' && !resources.includes( name ) ) {
                    messages.push( `${prefix}.content: Placeholder {{resource:${name}}} references non-existent resource` )
                }

                if( type === 'skill' && !skillNames.includes( name ) ) {
                    messages.push( `${prefix}.content: Placeholder {{skill:${name}}} references non-existent skill` )
                }

                if( type === 'input' && !inputKeys.includes( name ) ) {
                    messages.push( `${prefix}.content: Placeholder {{input:${name}}} references undefined input parameter` )
                }
            } )
    }
}


export { SkillValidator }
