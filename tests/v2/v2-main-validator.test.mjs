import { describe, test, expect } from '@jest/globals'
import { MainValidator } from '../../src/v2/task/MainValidator.mjs'


const validMain = {
    namespace: 'test',
    name: 'Test',
    description: 'A test schema.',
    version: '2.0.0',
    root: 'https://api.example.com',
    routes: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns status.',
            parameters: []
        }
    }
}


describe( 'MainValidator', () => {
    describe( 'validate()', () => {
        test( 'passes a valid minimal main block', () => {
            const { status, messages } = MainValidator
                .validate( { main: validMain } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails when main is null', () => {
            const { status, messages } = MainValidator
                .validate( { main: null } )

            expect( status ).toBe( false )
            expect( messages ).toContain( 'main: Missing export' )
        } )


        test( 'fails when main is undefined', () => {
            const { status, messages } = MainValidator
                .validate( { main: undefined } )

            expect( status ).toBe( false )
            expect( messages ).toContain( 'main: Missing export' )
        } )


        test( 'fails when main is not a plain object', () => {
            const { status, messages } = MainValidator
                .validate( { main: [ 'array' ] } )

            expect( status ).toBe( false )
            expect( messages ).toContain( 'main: Must be a plain object' )
        } )


        test( 'fails when required fields are missing', () => {
            const { status, messages } = MainValidator
                .validate( { main: {} } )

            expect( status ).toBe( false )
            expect( messages ).toContain( 'main.namespace: Missing required field' )
            expect( messages ).toContain( 'main.version: Missing required field' )
            expect( messages ).toContain( 'main.root: Missing required field' )
            expect( messages ).toContain( 'main.routes: Missing required field' )
        } )


        test( 'fails when namespace has invalid characters', () => {
            const main = { ...validMain, namespace: 'Test-123' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasNamespaceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.namespace' ) && msg.includes( '/^[a-z]+$/' )

                    return match
                } )

            expect( hasNamespaceError ).toBe( true )
        } )


        test( 'fails when version does not start with 2', () => {
            const main = { ...validMain, version: '1.0.0' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasVersionError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.version' )

                    return match
                } )

            expect( hasVersionError ).toBe( true )
        } )


        test( 'fails when root is not https', () => {
            const main = { ...validMain, root: 'http://api.example.com' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasRootError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.root' ) && msg.includes( 'https://' )

                    return match
                } )

            expect( hasRootError ).toBe( true )
        } )


        test( 'fails when root has trailing slash', () => {
            const main = { ...validMain, root: 'https://api.example.com/' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasTrailingError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'trailing slash' )

                    return match
                } )

            expect( hasTrailingError ).toBe( true )
        } )


        test( 'fails when more than 8 routes', () => {
            const routes = {}
            const routeNames = [ 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9' ]
            routeNames
                .forEach( ( name ) => {
                    routes[ name ] = {
                        method: 'GET',
                        path: `/${name}`,
                        description: `Route ${name}`,
                        parameters: []
                    }
                } )

            const main = { ...validMain, routes }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasRouteError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Maximum 8 routes' )

                    return match
                } )

            expect( hasRouteError ).toBe( true )
        } )


        test( 'validates route method', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'PATCH',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: []
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasMethodError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'method' ) && msg.includes( 'GET, POST, PUT, DELETE' )

                    return match
                } )

            expect( hasMethodError ).toBe( true )
        } )


        test( 'validates route parameters structure', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: [
                            { position: { key: 'a' }, z: {} }
                        ]
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasParamError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'position.value' ) || msg.includes( 'position.location' )

                    return match
                } )

            expect( hasParamError ).toBe( true )
        } )


        test( 'validates output mimeType', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: [],
                        output: {
                            mimeType: 'text/html',
                            schema: { type: 'string' }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasMimeError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'mimeType' )

                    return match
                } )

            expect( hasMimeError ).toBe( true )
        } )


        test( 'validates sharedLists entries', () => {
            const main = {
                ...validMain,
                sharedLists: [
                    { ref: 'evmChains' }
                ]
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasListError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'sharedLists[0].version' )

                    return match
                } )

            expect( hasListError ).toBe( true )
        } )


        test( 'fails when output schema is missing', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: [],
                        output: {
                            mimeType: 'application/json'
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasSchemaError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'output.schema' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasSchemaError ).toBe( true )
        } )


        test( 'fails when output schema type is missing', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: [],
                        output: {
                            mimeType: 'application/json',
                            schema: {}
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasTypeError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'schema.type' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasTypeError ).toBe( true )
        } )


        test( 'fails when mimeType and schema type are incompatible', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: [],
                        output: {
                            mimeType: 'application/json',
                            schema: { type: 'string' }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasConsistencyError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Incompatible' ) && msg.includes( 'application/json' )

                    return match
                } )

            expect( hasConsistencyError ).toBe( true )
        } )


        test( 'fails when image/png schema lacks base64 format', () => {
            const main = {
                ...validMain,
                routes: {
                    getChart: {
                        method: 'GET',
                        path: '/chart',
                        description: 'Returns chart.',
                        parameters: [],
                        output: {
                            mimeType: 'image/png',
                            schema: { type: 'string' }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasFormatError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'format' ) && msg.includes( 'base64' )

                    return match
                } )

            expect( hasFormatError ).toBe( true )
        } )


        test( 'passes valid image/png output with base64 format', () => {
            const main = {
                ...validMain,
                routes: {
                    getChart: {
                        method: 'GET',
                        path: '/chart',
                        description: 'Returns chart.',
                        parameters: [],
                        output: {
                            mimeType: 'image/png',
                            schema: { type: 'string', format: 'base64' }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes valid text/plain output', () => {
            const main = {
                ...validMain,
                routes: {
                    getSource: {
                        method: 'GET',
                        path: '/source',
                        description: 'Returns source code.',
                        parameters: [],
                        output: {
                            mimeType: 'text/plain',
                            schema: { type: 'string' }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails when properties declared on non-object type', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: [],
                        output: {
                            mimeType: 'application/json',
                            schema: {
                                type: 'array',
                                properties: { id: { type: 'string' } },
                                items: { type: 'string' }
                            }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasPropsError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'properties' ) && msg.includes( 'object' )

                    return match
                } )

            expect( hasPropsError ).toBe( true )
        } )


        test( 'fails when items declared on non-array type', () => {
            const main = {
                ...validMain,
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: [],
                        output: {
                            mimeType: 'application/json',
                            schema: {
                                type: 'object',
                                items: { type: 'string' }
                            }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasItemsError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'items' ) && msg.includes( 'array' )

                    return match
                } )

            expect( hasItemsError ).toBe( true )
        } )


        test( 'passes when output is omitted from route', () => {
            const { status, messages } = MainValidator
                .validate( { main: validMain } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes a fully featured main block', () => {
            const main = {
                namespace: 'testfull',
                name: 'TestFull',
                description: 'A fully featured schema.',
                version: '2.1.0',
                root: 'https://api.example.com',
                tags: [ 'test', 'full' ],
                requiredServerParams: [ 'API_KEY' ],
                requiredLibraries: [ 'ethers' ],
                sharedLists: [
                    { ref: 'evmChains', version: '1.0.0' }
                ],
                routes: {
                    getBalance: {
                        method: 'GET',
                        path: '/balance/{{address}}',
                        description: 'Get balance.',
                        parameters: [
                            {
                                position: { key: 'address', value: '{{USER_PARAM}}', location: 'insert' },
                                z: { primitive: 'string()', options: [ 'min(42)' ] }
                            }
                        ],
                        output: {
                            mimeType: 'application/json',
                            schema: { type: 'object' }
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )
    } )


    describe( 'preload validation', () => {
        test( 'passes a valid preload block', () => {
            const main = {
                ...validMain,
                routes: {
                    getLocations: {
                        method: 'GET',
                        path: '/locations.json',
                        description: 'All locations.',
                        parameters: [],
                        preload: {
                            enabled: true,
                            ttl: 604800,
                            description: 'All locations (~760KB)'
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes preload without optional description', () => {
            const main = {
                ...validMain,
                routes: {
                    getLocations: {
                        method: 'GET',
                        path: '/locations.json',
                        description: 'All locations.',
                        parameters: [],
                        preload: {
                            enabled: true,
                            ttl: 86400
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails when preload is not a plain object', () => {
            const main = {
                ...validMain,
                routes: {
                    getLocations: {
                        method: 'GET',
                        path: '/locations.json',
                        description: 'All locations.',
                        parameters: [],
                        preload: 'invalid'
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasPreloadError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'preload' ) && msg.includes( 'plain object' )

                    return match
                } )

            expect( hasPreloadError ).toBe( true )
        } )


        test( 'fails when preload.enabled is missing', () => {
            const main = {
                ...validMain,
                routes: {
                    getLocations: {
                        method: 'GET',
                        path: '/locations.json',
                        description: 'All locations.',
                        parameters: [],
                        preload: { ttl: 86400 }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasEnabledError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'preload.enabled' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasEnabledError ).toBe( true )
        } )


        test( 'fails when preload.enabled is not boolean', () => {
            const main = {
                ...validMain,
                routes: {
                    getLocations: {
                        method: 'GET',
                        path: '/locations.json',
                        description: 'All locations.',
                        parameters: [],
                        preload: { enabled: 'yes', ttl: 86400 }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasTypeError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'preload.enabled' ) && msg.includes( 'boolean' )

                    return match
                } )

            expect( hasTypeError ).toBe( true )
        } )


        test( 'fails when preload.ttl is missing', () => {
            const main = {
                ...validMain,
                routes: {
                    getLocations: {
                        method: 'GET',
                        path: '/locations.json',
                        description: 'All locations.',
                        parameters: [],
                        preload: { enabled: true }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasTtlError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'preload.ttl' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasTtlError ).toBe( true )
        } )


        test( 'fails when preload.ttl is not a positive integer', () => {
            const testCases = [ 0, -100, 3.5, 'one week' ]

            testCases
                .forEach( ( ttlValue ) => {
                    const main = {
                        ...validMain,
                        routes: {
                            getLocations: {
                                method: 'GET',
                                path: '/locations.json',
                                description: 'All locations.',
                                parameters: [],
                                preload: { enabled: true, ttl: ttlValue }
                            }
                        }
                    }

                    const { status, messages } = MainValidator
                        .validate( { main } )

                    expect( status ).toBe( false )

                    const hasTtlError = messages
                        .some( ( msg ) => {
                            const match = msg.includes( 'preload.ttl' ) && msg.includes( 'positive integer' )

                            return match
                        } )

                    expect( hasTtlError ).toBe( true )
                } )
        } )


        test( 'fails when preload.description is not a string', () => {
            const main = {
                ...validMain,
                routes: {
                    getLocations: {
                        method: 'GET',
                        path: '/locations.json',
                        description: 'All locations.',
                        parameters: [],
                        preload: { enabled: true, ttl: 86400, description: 123 }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'preload.description' ) && msg.includes( 'string' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'passes when preload is omitted from route', () => {
            const { status, messages } = MainValidator
                .validate( { main: validMain } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )
    } )
} )
