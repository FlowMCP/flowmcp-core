class MainValidator {
    static validate( { main } ) {
        const messages = []

        if( main === undefined || main === null ) {
            messages.push( 'main: Missing export' )

            return { status: false, messages }
        }

        if( typeof main !== 'object' || Array.isArray( main ) ) {
            messages.push( 'main: Must be a plain object' )

            return { status: false, messages }
        }

        MainValidator.#validateTopLevel( { main, messages } )

        if( messages.length > 0 ) {
            return { status: false, messages }
        }

        MainValidator.#validateRoutes( { main, messages } )

        const status = messages.length === 0

        return { status, messages }
    }


    static #validateTopLevel( { main, messages } ) {
        const requiredFields = [
            [ 'namespace', 'string' ],
            [ 'name',      'string' ],
            [ 'description', 'string' ],
            [ 'version',   'string' ],
            [ 'root',      'string' ],
            [ 'routes',    'object' ]
        ]

        requiredFields
            .forEach( ( [ key, type ] ) => {
                if( main[ key ] === undefined || main[ key ] === null ) {
                    messages.push( `main.${key}: Missing required field` )
                } else if( typeof main[ key ] !== type ) {
                    messages.push( `main.${key}: Must be type "${type}"` )
                }
            } )

        if( messages.length > 0 ) {
            return
        }

        const namespacePattern = /^[a-z]+$/
        if( !namespacePattern.test( main['namespace'] ) ) {
            messages.push( `main.namespace: Must match pattern /^[a-z]+$/, got "${main['namespace']}"` )
        }

        const versionPattern = /^2\.\d+\.\d+$/
        if( !versionPattern.test( main['version'] ) ) {
            messages.push( `main.version: Must match pattern /^2\\.\\d+\\.\\d+$/, got "${main['version']}"` )
        }

        if( !main['root'].startsWith( 'https://' ) ) {
            messages.push( `main.root: Must start with "https://", got "${main['root']}"` )
        }

        if( main['root'].endsWith( '/' ) ) {
            messages.push( `main.root: Must not end with trailing slash` )
        }

        const routeNames = Object.keys( main['routes'] )
        if( routeNames.length > 8 ) {
            messages.push( `main.routes: Maximum 8 routes allowed, got ${routeNames.length}` )
        }

        if( main['tags'] !== undefined ) {
            if( !Array.isArray( main['tags'] ) ) {
                messages.push( 'main.tags: Must be an array' )
            }
        }

        if( main['requiredServerParams'] !== undefined ) {
            if( !Array.isArray( main['requiredServerParams'] ) ) {
                messages.push( 'main.requiredServerParams: Must be an array' )
            }
        }

        if( main['requiredLibraries'] !== undefined ) {
            if( !Array.isArray( main['requiredLibraries'] ) ) {
                messages.push( 'main.requiredLibraries: Must be an array' )
            }
        }

        if( main['sharedLists'] !== undefined ) {
            if( !Array.isArray( main['sharedLists'] ) ) {
                messages.push( 'main.sharedLists: Must be an array' )
            } else {
                main['sharedLists']
                    .forEach( ( entry, index ) => {
                        if( !entry['ref'] ) {
                            messages.push( `main.sharedLists[${index}].ref: Missing required field` )
                        }
                        if( !entry['version'] ) {
                            messages.push( `main.sharedLists[${index}].version: Missing required field` )
                        }
                    } )
            }
        }
    }


    static #validateRoutes( { main, messages } ) {
        const { routes } = main
        const routeNames = Object.keys( routes )

        routeNames
            .forEach( ( routeName ) => {
                const route = routes[ routeName ]
                const prefix = `main.routes.${routeName}`

                MainValidator.#validateSingleRoute( { route, prefix, messages } )
            } )
    }


    static #validateSingleRoute( { route, prefix, messages } ) {
        const allowedMethods = [ 'GET', 'POST', 'PUT', 'DELETE' ]

        if( !route['method'] ) {
            messages.push( `${prefix}.method: Missing required field` )
        } else if( !allowedMethods.includes( route['method'] ) ) {
            messages.push( `${prefix}.method: Must be one of ${allowedMethods.join( ', ' )}` )
        }

        if( !route['path'] ) {
            messages.push( `${prefix}.path: Missing required field` )
        } else if( typeof route['path'] !== 'string' ) {
            messages.push( `${prefix}.path: Must be type "string"` )
        }

        if( !route['description'] ) {
            messages.push( `${prefix}.description: Missing required field` )
        }

        if( route['parameters'] === undefined ) {
            messages.push( `${prefix}.parameters: Missing required field` )
        } else if( !Array.isArray( route['parameters'] ) ) {
            messages.push( `${prefix}.parameters: Must be an array` )
        } else {
            route['parameters']
                .forEach( ( param, index ) => {
                    MainValidator.#validateParameter( {
                        param,
                        prefix: `${prefix}.parameters[${index}]`,
                        messages
                    } )
                } )
        }

        if( route['output'] !== undefined ) {
            MainValidator.#validateOutput( {
                output: route['output'],
                prefix: `${prefix}.output`,
                messages
            } )
        }
    }


    static #validateParameter( { param, prefix, messages } ) {
        if( !param['position'] ) {
            messages.push( `${prefix}.position: Missing required field` )
        } else {
            const { position } = param
            const allowedLocations = [ 'insert', 'query', 'body' ]

            if( !position['key'] ) {
                messages.push( `${prefix}.position.key: Missing required field` )
            }
            if( !position['value'] ) {
                messages.push( `${prefix}.position.value: Missing required field` )
            }
            if( !position['location'] ) {
                messages.push( `${prefix}.position.location: Missing required field` )
            } else if( !allowedLocations.includes( position['location'] ) ) {
                messages.push( `${prefix}.position.location: Must be one of ${allowedLocations.join( ', ' )}` )
            }
        }

        if( !param['z'] ) {
            messages.push( `${prefix}.z: Missing required field` )
        } else {
            const { z } = param

            if( !z['primitive'] ) {
                messages.push( `${prefix}.z.primitive: Missing required field` )
            }

            if( z['options'] !== undefined && !Array.isArray( z['options'] ) ) {
                messages.push( `${prefix}.z.options: Must be an array` )
            }
        }
    }


    static #validateOutput( { output, prefix, messages } ) {
        const allowedMimeTypes = [ 'application/json', 'image/png', 'text/plain' ]

        if( !output['mimeType'] ) {
            messages.push( `${prefix}.mimeType: Missing required field` )
        } else if( !allowedMimeTypes.includes( output['mimeType'] ) ) {
            messages.push( `${prefix}.mimeType: Must be one of ${allowedMimeTypes.join( ', ' )}` )
        }

        if( output['schema'] !== undefined ) {
            if( typeof output['schema'] !== 'object' || Array.isArray( output['schema'] ) ) {
                messages.push( `${prefix}.schema: Must be a plain object` )
            }
        }
    }
}


export { MainValidator }
