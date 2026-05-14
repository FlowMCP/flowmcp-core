class MainValidator {
    static validate( { main } ) {
        const messages = []
        const warnings = []

        if( main === undefined || main === null ) {
            messages.push( 'main: Missing export' )

            return { status: false, messages, warnings }
        }

        if( typeof main !== 'object' || Array.isArray( main ) ) {
            messages.push( 'main: Must be a plain object' )

            return { status: false, messages, warnings }
        }

        if( main[ 'skills' ] !== undefined ) {
            messages.push( 'VAL109 main.skills: Forbidden in v4 — use Skills-only schemas via CLI skill registration instead' )
        }

        MainValidator.#validateTopLevel( { main, messages, warnings } )

        if( messages.length > 0 ) {
            return { status: false, messages, warnings }
        }

        MainValidator.#validateTools( { main, messages, warnings } )

        if( main[ 'resources' ] !== undefined ) {
            MainValidator.#validateResources( { main, messages } )
        }

        const status = messages.length === 0

        return { status, messages, warnings }
    }


    static #validateTopLevel( { main, messages, warnings } ) {
        const hasTools = main[ 'tools' ] !== undefined && main[ 'tools' ] !== null
        const hasRoutes = main[ 'routes' ] !== undefined && main[ 'routes' ] !== null
        const hasResources = main[ 'resources' ] !== undefined && main[ 'resources' ] !== null
        const toolsKey = hasTools ? 'tools' : 'routes'

        const requiredFields = [
            [ 'namespace', 'string' ],
            [ 'name',      'string' ],
            [ 'description', 'string' ],
            [ 'version',   'string' ],
            [ 'root',      'string' ]
        ]

        requiredFields
            .forEach( ( [ key, type ] ) => {
                if( main[ key ] === undefined || main[ key ] === null ) {
                    messages.push( `main.${key}: Missing required field` )
                } else if( typeof main[ key ] !== type ) {
                    messages.push( `main.${key}: Must be type "${type}"` )
                }
            } )

        if( !hasTools && !hasRoutes ) {
            if( !hasResources ) {
                messages.push( 'main.tools: Missing required field — at least one primitive (tools or resources) is required' )
            }
        } else {
            const toolsValue = main[ toolsKey ]
            if( typeof toolsValue !== 'object' || Array.isArray( toolsValue ) ) {
                messages.push( `main.${toolsKey}: Must be type "object"` )
            }
        }

        if( messages.length > 0 ) {
            return
        }

        const namespacePattern = /^[a-z][a-z0-9-]*$/
        if( !namespacePattern.test( main[ 'namespace' ] ) ) {
            messages.push( `main.namespace: Must match pattern /^[a-z][a-z0-9-]*$/, got "${main[ 'namespace' ]}"` )
        }

        const versionPattern = /^4\.\d+\.\d+$/
        if( !versionPattern.test( main[ 'version' ] ) ) {
            messages.push( `VAL108 main.version: Must match pattern /^4\\.\\d+\\.\\d+$/, got "${main[ 'version' ]}"` )
        }

        if( main[ 'root' ] === '' ) {
            warnings.push( 'main.root: Empty root URL — schema likely uses executeRequest handlers only' )
        } else if( !main[ 'root' ].startsWith( 'https://' ) ) {
            messages.push( `main.root: Must start with "https://", got "${main[ 'root' ]}"` )
        } else if( main[ 'root' ].endsWith( '/' ) ) {
            messages.push( 'main.root: Must not end with trailing slash' )
        }

        if( hasTools || hasRoutes ) {
            const toolNames = Object.keys( main[ toolsKey ] )
            if( toolNames.length > 8 ) {
                messages.push( `main.${toolsKey}: Maximum 8 tools allowed, got ${toolNames.length}` )
            }
        }

        if( main[ 'tags' ] !== undefined ) {
            if( !Array.isArray( main[ 'tags' ] ) ) {
                messages.push( 'main.tags: Must be an array' )
            }
        }

        if( main[ 'requiredServerParams' ] !== undefined ) {
            if( !Array.isArray( main[ 'requiredServerParams' ] ) ) {
                messages.push( 'main.requiredServerParams: Must be an array' )
            }
        }

        if( main[ 'requiredLibraries' ] !== undefined ) {
            if( !Array.isArray( main[ 'requiredLibraries' ] ) ) {
                messages.push( 'main.requiredLibraries: Must be an array' )
            }
        }

        if( main[ 'sharedLists' ] !== undefined ) {
            if( !Array.isArray( main[ 'sharedLists' ] ) ) {
                messages.push( 'main.sharedLists: Must be an array' )
            } else {
                main[ 'sharedLists' ]
                    .forEach( ( entry, index ) => {
                        if( !entry[ 'ref' ] ) {
                            messages.push( `main.sharedLists[${index}].ref: Missing required field` )
                        }
                        if( !entry[ 'version' ] ) {
                            messages.push( `main.sharedLists[${index}].version: Missing required field` )
                        }
                    } )
            }
        }
    }


    static #validateTools( { main, messages, warnings } ) {
        const hasTools = main[ 'tools' ] !== undefined
        const hasRoutes = main[ 'routes' ] !== undefined
        const toolsKey = hasTools ? 'tools' : 'routes'
        const toolsObj = main[ toolsKey ]

        if( !toolsObj || typeof toolsObj !== 'object' ) {
            return
        }

        const toolNames = Object.keys( toolsObj )
        const isV3 = false

        toolNames
            .forEach( ( toolName ) => {
                const tool = toolsObj[ toolName ]
                const prefix = `main.${toolsKey}.${toolName}`

                MainValidator.#validateSingleRoute( { route: tool, prefix, messages } )
                MainValidator.#validateTestCount( { tool, toolName, isV3, messages, warnings } )
                MainValidator.#validateMeta( { tool, toolName, messages } )
            } )
    }


    static #validateMeta( { tool, toolName, messages } ) {
        const prefix = `main.tools.${toolName}.meta`
        const meta = tool[ 'meta' ]

        if( meta === undefined || meta === null ) {
            messages.push( `VAL100 ${prefix}: Missing required field — meta block is mandatory in v4` )

            return
        }

        if( typeof meta !== 'object' || Array.isArray( meta ) ) {
            messages.push( `VAL100 ${prefix}: Must be a plain object` )

            return
        }

        const requiredFields = [
            [ 'isReadOnly',          'boolean', 'VAL101' ],
            [ 'isConcurrencySafe',   'boolean', 'VAL102' ],
            [ 'isDestructive',       'boolean', 'VAL103' ],
            [ 'searchHint',          'string',  'VAL104' ],
            [ 'aliases',             'array',   'VAL105' ],
            [ 'alwaysLoad',          'boolean', 'VAL106' ]
        ]

        requiredFields
            .forEach( ( [ key, type, code ] ) => {
                const value = meta[ key ]

                if( value === undefined || value === null ) {
                    messages.push( `${code} ${prefix}.${key}: Missing required field` )

                    return
                }

                if( type === 'array' ) {
                    if( !Array.isArray( value ) ) {
                        messages.push( `${code} ${prefix}.${key}: Must be an array` )
                    }

                    return
                }

                if( typeof value !== type ) {
                    messages.push( `${code} ${prefix}.${key}: Must be type "${type}"` )
                }
            } )
    }


    static #validateTestCount( { tool, toolName, isV3, messages, warnings } ) {
        const tests = tool[ 'tests' ]
        const count = Array.isArray( tests ) ? tests.length : 0
        const minTests = 3

        if( count >= minTests ) {
            return
        }

        warnings.push( `TST001 warning ${toolName}: Should have at least ${minTests} tests (found ${count})` )
    }


    static #validateResources( { main, messages } ) {
        const { resources } = main

        if( typeof resources !== 'object' || Array.isArray( resources ) || resources === null ) {
            messages.push( 'main.resources: Must be a plain object' )

            return
        }

        const resourceNames = Object.keys( resources )

        if( resourceNames.length > 2 ) {
            messages.push( `main.resources: Maximum 2 resources allowed, got ${resourceNames.length}` )
        }

        resourceNames
            .forEach( ( resourceName ) => {
                const resource = resources[ resourceName ]
                const prefix = `main.resources.${resourceName}`

                MainValidator.#validateSingleResource( { resource, prefix, messages } )
            } )
    }


    static #validateSingleResource( { resource, prefix, messages } ) {
        if( resource[ 'source' ] === undefined || resource[ 'source' ] === null ) {
            messages.push( `${prefix}.source: Missing required field` )
        } else if( typeof resource[ 'source' ] !== 'string' ) {
            messages.push( `${prefix}.source: Must be type "string"` )
        } else if( resource[ 'source' ] !== 'sqlite' ) {
            messages.push( `${prefix}.source: Must be "sqlite", got "${resource[ 'source' ]}"` )
        }

        if( resource[ 'description' ] === undefined || resource[ 'description' ] === null ) {
            messages.push( `${prefix}.description: Missing required field` )
        } else if( typeof resource[ 'description' ] !== 'string' ) {
            messages.push( `${prefix}.description: Must be type "string"` )
        }

        if( resource[ 'database' ] === undefined || resource[ 'database' ] === null ) {
            messages.push( `${prefix}.database: Missing required field` )
        } else if( typeof resource[ 'database' ] !== 'string' ) {
            messages.push( `${prefix}.database: Must be type "string"` )
        } else if( !resource[ 'database' ].endsWith( '.db' ) ) {
            messages.push( `${prefix}.database: Must end with ".db", got "${resource[ 'database' ]}"` )
        }

        if( resource[ 'queries' ] === undefined || resource[ 'queries' ] === null ) {
            messages.push( `${prefix}.queries: Missing required field` )
        } else if( typeof resource[ 'queries' ] !== 'object' || Array.isArray( resource[ 'queries' ] ) ) {
            messages.push( `${prefix}.queries: Must be a plain object` )
        } else {
            const queryNames = Object.keys( resource[ 'queries' ] )

            if( queryNames.length > 4 ) {
                messages.push( `${prefix}.queries: Maximum 4 queries allowed, got ${queryNames.length}` )
            }
        }
    }


    static #validateSingleRoute( { route, prefix, messages } ) {
        const allowedMethods = [ 'GET', 'POST', 'PUT', 'DELETE' ]

        if( !route[ 'method' ] ) {
            messages.push( `${prefix}.method: Missing required field` )
        } else if( !allowedMethods.includes( route[ 'method' ] ) ) {
            messages.push( `${prefix}.method: Must be one of ${allowedMethods.join( ', ' )}` )
        }

        if( !route[ 'path' ] ) {
            messages.push( `${prefix}.path: Missing required field` )
        } else if( typeof route[ 'path' ] !== 'string' ) {
            messages.push( `${prefix}.path: Must be type "string"` )
        }

        if( !route[ 'description' ] ) {
            messages.push( `${prefix}.description: Missing required field` )
        }

        if( route[ 'parameters' ] === undefined ) {
            messages.push( `${prefix}.parameters: Missing required field` )
        } else if( !Array.isArray( route[ 'parameters' ] ) ) {
            messages.push( `${prefix}.parameters: Must be an array` )
        } else {
            route[ 'parameters' ]
                .forEach( ( param, index ) => {
                    MainValidator.#validateParameter( {
                        param,
                        prefix: `${prefix}.parameters[${index}]`,
                        messages
                    } )
                } )
        }

        if( route[ 'output' ] !== undefined ) {
            MainValidator.#validateOutput( {
                output: route[ 'output' ],
                prefix: `${prefix}.output`,
                messages
            } )
        }

        if( route[ 'preload' ] !== undefined ) {
            MainValidator.#validatePreload( {
                preload: route[ 'preload' ],
                prefix: `${prefix}.preload`,
                messages
            } )
        }
    }


    static #validateParameter( { param, prefix, messages } ) {
        if( !param[ 'position' ] ) {
            messages.push( `${prefix}.position: Missing required field` )
        } else {
            const { position } = param
            const allowedLocations = [ 'insert', 'query', 'body' ]

            if( !position[ 'key' ] ) {
                messages.push( `${prefix}.position.key: Missing required field` )
            }
            if( !position[ 'value' ] ) {
                messages.push( `${prefix}.position.value: Missing required field` )
            }
            if( !position[ 'location' ] ) {
                messages.push( `${prefix}.position.location: Missing required field` )
            } else if( !allowedLocations.includes( position[ 'location' ] ) ) {
                messages.push( `${prefix}.position.location: Must be one of ${allowedLocations.join( ', ' )}` )
            }
        }

        if( !param[ 'z' ] ) {
            messages.push( `${prefix}.z: Missing required field` )
        } else {
            const { z } = param

            if( !z[ 'primitive' ] ) {
                messages.push( `${prefix}.z.primitive: Missing required field` )
            }

            if( z[ 'options' ] !== undefined && !Array.isArray( z[ 'options' ] ) ) {
                messages.push( `${prefix}.z.options: Must be an array` )
            }

            if( z[ 'enum' ] !== undefined ) {
                if( !Array.isArray( z[ 'enum' ] ) ) {
                    messages.push( `VAL107 ${prefix}.z.enum: Must be an array` )
                } else {
                    z[ 'enum' ]
                        .forEach( ( entry, entryIndex ) => {
                            if( typeof entry !== 'string' || !/^\{\{[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+\}\}$/.test( entry ) ) {
                                messages.push( `VAL107 ${prefix}.z.enum[${entryIndex}]: Must be a shared-list reference of form "{{listName:alias}}", got "${entry}"` )
                            }
                        } )
                }
            }
        }
    }


    static #validateOutput( { output, prefix, messages } ) {
        const allowedMimeTypes = [ 'application/json', 'image/png', 'text/plain' ]

        if( !output[ 'mimeType' ] ) {
            messages.push( `${prefix}.mimeType: Missing required field` )
        } else if( !allowedMimeTypes.includes( output[ 'mimeType' ] ) ) {
            messages.push( `${prefix}.mimeType: Must be one of ${allowedMimeTypes.join( ', ' )}` )
        }

        if( !output[ 'schema' ] ) {
            messages.push( `${prefix}.schema: Missing required field` )
        } else if( typeof output[ 'schema' ] !== 'object' || Array.isArray( output[ 'schema' ] ) ) {
            messages.push( `${prefix}.schema: Must be a plain object` )
        } else {
            MainValidator.#validateSchema( {
                schema: output[ 'schema' ],
                mimeType: output[ 'mimeType' ],
                prefix: `${prefix}.schema`,
                messages
            } )
        }
    }


    static #validatePreload( { preload, prefix, messages } ) {
        if( typeof preload !== 'object' || Array.isArray( preload ) || preload === null ) {
            messages.push( `${prefix}: Must be a plain object` )

            return
        }

        if( preload[ 'enabled' ] === undefined ) {
            messages.push( `${prefix}.enabled: Missing required field` )
        } else if( typeof preload[ 'enabled' ] !== 'boolean' ) {
            messages.push( `${prefix}.enabled: Must be type "boolean"` )
        }

        if( preload[ 'ttl' ] === undefined ) {
            messages.push( `${prefix}.ttl: Missing required field` )
        } else if( typeof preload[ 'ttl' ] !== 'number' || !Number.isInteger( preload[ 'ttl' ] ) || preload[ 'ttl' ] <= 0 ) {
            messages.push( `${prefix}.ttl: Must be a positive integer` )
        }

        if( preload[ 'description' ] !== undefined && typeof preload[ 'description' ] !== 'string' ) {
            messages.push( `${prefix}.description: Must be type "string"` )
        }
    }


    static #validateSchema( { schema, mimeType, prefix, messages } ) {
        const allowedTypes = [ 'string', 'number', 'boolean', 'object', 'array' ]

        if( !schema[ 'type' ] ) {
            messages.push( `${prefix}.type: Missing required field` )

            return
        }

        if( !allowedTypes.includes( schema[ 'type' ] ) ) {
            messages.push( `${prefix}.type: Must be one of ${allowedTypes.join( ', ' )}` )

            return
        }

        MainValidator.#validateMimeTypeConsistency( {
            mimeType,
            schemaType: schema[ 'type' ],
            format: schema[ 'format' ],
            prefix,
            messages
        } )

        if( schema[ 'properties' ] !== undefined && schema[ 'type' ] !== 'object' ) {
            messages.push( `${prefix}.properties: Only valid when type is "object"` )
        }

        if( schema[ 'items' ] !== undefined && schema[ 'type' ] !== 'array' ) {
            messages.push( `${prefix}.items: Only valid when type is "array"` )
        }
    }


    static #validateMimeTypeConsistency( { mimeType, schemaType, format, prefix, messages } ) {
        if( !mimeType ) {
            return
        }

        const mimeRules = {
            'application/json': [ 'object', 'array' ],
            'image/png': [ 'string' ],
            'text/plain': [ 'string' ]
        }

        const allowed = mimeRules[ mimeType ]
        if( !allowed ) {
            return
        }

        if( !allowed.includes( schemaType ) ) {
            messages.push( `${prefix}.type: Incompatible with mimeType "${mimeType}", expected ${allowed.join( ' or ' )}` )
        }

        if( mimeType === 'image/png' && schemaType === 'string' && format !== 'base64' ) {
            messages.push( `${prefix}.format: Must be "base64" when mimeType is "image/png"` )
        }
    }
}


export { MainValidator }
