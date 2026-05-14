import { IdResolver } from './IdResolver.mjs'


class AgentManifestValidator {
    static validate( { manifest } ) {
        const struct = { status: false, messages: [] }

        if( manifest === undefined || manifest === null ) {
            struct[ 'messages' ].push( 'manifest: Missing value' )

            return struct
        }

        if( typeof manifest !== 'object' || Array.isArray( manifest ) ) {
            struct[ 'messages' ].push( 'manifest: Must be a plain object' )

            return struct
        }

        AgentManifestValidator._validateRequiredFields( { manifest, messages: struct[ 'messages' ] } )

        if( struct[ 'messages' ].length > 0 ) {
            return struct
        }

        AgentManifestValidator._validateToolReferences( { manifest, messages: struct[ 'messages' ] } )
        AgentManifestValidator._validateSlashRule( { obj: manifest[ 'prompts' ], fieldName: 'prompts', messages: struct[ 'messages' ], allowSlashes: true } )
        AgentManifestValidator._validateSlashRule( { obj: manifest[ 'skills' ], fieldName: 'skills', messages: struct[ 'messages' ], allowSlashes: false } )
        AgentManifestValidator._validateSlashRule( { obj: manifest[ 'resources' ], fieldName: 'resources', messages: struct[ 'messages' ], allowSlashes: true } )
        AgentManifestValidator._validateTests( { manifest, messages: struct[ 'messages' ] } )
        AgentManifestValidator._validateSelections( { manifest, messages: struct[ 'messages' ] } )
        AgentManifestValidator._validateElicitation( { manifest, messages: struct[ 'messages' ] } )

        if( struct[ 'messages' ].length === 0 ) {
            struct[ 'status' ] = true
        }

        return struct
    }


    static _validateRequiredFields( { manifest, messages } ) {
        const namePattern = /^[a-z][a-z0-9-]*$/

        if( manifest[ 'name' ] === undefined || manifest[ 'name' ] === null ) {
            messages.push( 'manifest.name: Missing required field' )
        } else if( typeof manifest[ 'name' ] !== 'string' ) {
            messages.push( 'manifest.name: Must be type "string"' )
        } else if( !namePattern.test( manifest[ 'name' ] ) ) {
            messages.push( `manifest.name: Must match pattern /^[a-z][a-z0-9-]*$/, got "${manifest[ 'name' ]}"` )
        }

        if( manifest[ 'description' ] === undefined || manifest[ 'description' ] === null ) {
            messages.push( 'manifest.description: Missing required field' )
        } else if( typeof manifest[ 'description' ] !== 'string' ) {
            messages.push( 'manifest.description: Must be type "string"' )
        } else if( manifest[ 'description' ].trim().length === 0 ) {
            messages.push( 'manifest.description: Must not be empty' )
        }

        if( manifest[ 'model' ] === undefined || manifest[ 'model' ] === null ) {
            messages.push( 'manifest.model: Missing required field' )
        } else if( typeof manifest[ 'model' ] !== 'string' ) {
            messages.push( 'manifest.model: Must be type "string"' )
        } else if( !manifest[ 'model' ].includes( '/' ) ) {
            messages.push( `manifest.model: Must contain "/" (OpenRouter format), got "${manifest[ 'model' ]}"` )
        }

        if( manifest[ 'version' ] === undefined || manifest[ 'version' ] === null ) {
            messages.push( 'manifest.version: Missing required field' )
        } else if( typeof manifest[ 'version' ] !== 'string' ) {
            messages.push( 'manifest.version: Must be type "string"' )
        } else if( manifest[ 'version' ] !== 'flowmcp/3.0.0' ) {
            messages.push( `manifest.version: Must be "flowmcp/3.0.0", got "${manifest[ 'version' ]}"` )
        }

        if( manifest[ 'systemPrompt' ] === undefined || manifest[ 'systemPrompt' ] === null ) {
            messages.push( 'manifest.systemPrompt: Missing required field' )
        } else if( typeof manifest[ 'systemPrompt' ] !== 'string' ) {
            messages.push( 'manifest.systemPrompt: Must be type "string"' )
        } else if( manifest[ 'systemPrompt' ].trim().length === 0 ) {
            messages.push( 'manifest.systemPrompt: Must not be empty' )
        }

        if( manifest[ 'tools' ] === undefined || manifest[ 'tools' ] === null ) {
            messages.push( 'manifest.tools: Missing required field' )
        } else if( typeof manifest[ 'tools' ] !== 'object' || Array.isArray( manifest[ 'tools' ] ) ) {
            messages.push( 'manifest.tools: Must be a plain object' )
        } else if( Object.keys( manifest[ 'tools' ] ).length === 0 ) {
            messages.push( 'manifest.tools: Must not be empty' )
        }

        if( manifest[ 'tests' ] === undefined || manifest[ 'tests' ] === null ) {
            messages.push( 'manifest.tests: Missing required field' )
        } else if( !Array.isArray( manifest[ 'tests' ] ) ) {
            messages.push( 'manifest.tests: Must be an array' )
        } else if( manifest[ 'tests' ].length < 3 ) {
            messages.push( `manifest.tests: Minimum 3 tests required, got ${manifest[ 'tests' ].length}` )
        }
    }


    static _validateToolReferences( { manifest, messages } ) {
        const tools = manifest[ 'tools' ]

        if( typeof tools !== 'object' || tools === null || Array.isArray( tools ) ) {
            return
        }

        Object.entries( tools )
            .forEach( ( [ key, value ] ) => {
                const hasSlash = key.includes( '/' )

                if( hasSlash ) {
                    if( value !== null ) {
                        messages.push( `manifest.tools["${key}"]: External reference (contains "/") must have null value` )
                    }

                    const { status, messages: idMessages } = IdResolver.validate( { id: key } )

                    if( !status ) {
                        idMessages
                            .forEach( ( msg ) => {
                                messages.push( `manifest.tools["${key}"]: Invalid ID — ${msg}` )
                            } )
                    }
                } else {
                    if( value === null || value === undefined ) {
                        messages.push( `manifest.tools["${key}"]: Inline tool (no "/") must have a tool definition object` )
                    } else if( typeof value !== 'object' || Array.isArray( value ) ) {
                        messages.push( `manifest.tools["${key}"]: Inline tool must be a plain object` )
                    }
                }
            } )
    }


    static _validateSlashRule( { obj, fieldName, messages, allowSlashes } ) {
        if( obj === undefined || obj === null ) {
            return
        }

        if( typeof obj !== 'object' || Array.isArray( obj ) ) {
            messages.push( `manifest.${fieldName}: Must be a plain object` )

            return
        }

        Object.entries( obj )
            .forEach( ( [ key, value ] ) => {
                const hasSlash = key.includes( '/' )

                if( hasSlash && !allowSlashes ) {
                    messages.push( `manifest.${fieldName}["${key}"]: Slash keys are not allowed (model-specific, inline-only)` )
                } else if( hasSlash && value !== null ) {
                    messages.push( `manifest.${fieldName}["${key}"]: External reference (contains "/") must have null value` )
                } else if( !hasSlash && value === null ) {
                    messages.push( `manifest.${fieldName}["${key}"]: Inline entry (no "/") must have a definition object` )
                }
            } )
    }


    static _validateTests( { manifest, messages } ) {
        const tests = manifest[ 'tests' ]

        if( !Array.isArray( tests ) ) {
            return
        }

        tests
            .forEach( ( test, index ) => {
                AgentManifestValidator._validateSingleTest( { test, index, messages } )
            } )
    }


    static _validateSingleTest( { test, index, messages } ) {
        const prefix = `manifest.tests[${index}]`

        if( test[ '_description' ] === undefined || test[ '_description' ] === null ) {
            messages.push( `${prefix}._description: Missing required field` )
        } else if( typeof test[ '_description' ] !== 'string' ) {
            messages.push( `${prefix}._description: Must be type "string"` )
        }

        if( test[ 'input' ] === undefined || test[ 'input' ] === null ) {
            messages.push( `${prefix}.input: Missing required field` )
        } else if( typeof test[ 'input' ] !== 'string' ) {
            messages.push( `${prefix}.input: Must be type "string"` )
        }

        if( test[ 'expectedTools' ] === undefined || test[ 'expectedTools' ] === null ) {
            messages.push( `${prefix}.expectedTools: Missing required field` )
        } else if( !Array.isArray( test[ 'expectedTools' ] ) ) {
            messages.push( `${prefix}.expectedTools: Must be an array` )
        } else if( test[ 'expectedTools' ].length === 0 ) {
            messages.push( `${prefix}.expectedTools: Must not be empty` )
        } else {
            test[ 'expectedTools' ]
                .forEach( ( toolId, toolIndex ) => {
                    if( typeof toolId !== 'string' || !toolId.includes( '/' ) ) {
                        messages.push( `${prefix}.expectedTools[${toolIndex}]: Must be a valid ID containing "/", got "${toolId}"` )
                    }
                } )
        }
    }


    static _validateSelections( { manifest, messages } ) {
        const selections = manifest[ 'selections' ]

        if( selections === undefined || selections === null ) {
            return
        }

        if( !Array.isArray( selections ) ) {
            messages.push( 'AGT010 manifest.selections: Must be an array' )

            return
        }

        selections
            .forEach( ( id, index ) => {
                if( typeof id !== 'string' ) {
                    messages.push( `AGT010 manifest.selections[${index}]: Must be type "string", got ${typeof id}` )

                    return
                }

                const { status, messages: idMessages } = IdResolver.validate( { id } )

                if( !status ) {
                    idMessages
                        .forEach( ( msg ) => {
                            messages.push( `AGT010 manifest.selections[${index}]: Invalid ID "${id}" — ${msg}` )
                        } )

                    return
                }

                const segments = id.split( '/' )
                const isSelectionId = segments.length === 3 && segments[ 1 ] === 'selection'

                if( !isSelectionId ) {
                    messages.push( `AGT010 manifest.selections[${index}]: Must be a selection ID of form "namespace/selection/name", got "${id}"` )
                }
            } )
    }


    static _validateElicitation( { manifest, messages } ) {
        const elicitation = manifest[ 'elicitation' ]

        if( elicitation === undefined || elicitation === null ) {
            return
        }

        if( typeof elicitation !== 'object' || Array.isArray( elicitation ) ) {
            messages.push( 'AGT011 manifest.elicitation: Must be a plain object' )

            return
        }

        const maxRounds = elicitation[ 'maxRounds' ]

        if( maxRounds === undefined || maxRounds === null ) {
            messages.push( 'AGT011 manifest.elicitation.maxRounds: Missing required field' )

            return
        }

        if( typeof maxRounds !== 'number' || !Number.isInteger( maxRounds ) || maxRounds <= 0 ) {
            messages.push( `AGT011 manifest.elicitation.maxRounds: Must be a positive integer, got ${maxRounds}` )
        }
    }
}


export { AgentManifestValidator }
