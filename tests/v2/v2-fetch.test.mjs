import { describe, test, expect, jest, afterEach } from '@jest/globals'
import { Fetch } from '../../src/v2/task/Fetch.mjs'

const originalFetch = global.fetch


afterEach( () => {
    global.fetch = originalFetch
} )


const minimalMain = {
    namespace: 'test',
    name: 'Test',
    description: 'Test',
    version: '2.0.0',
    root: 'https://api.example.com',
    headers: { 'Accept': 'application/json' },
    routes: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns status.',
            parameters: []
        },
        getUser: {
            method: 'GET',
            path: '/users/{{userId}}',
            description: 'Returns user.',
            parameters: [
                {
                    position: { key: 'userId', value: '{{USER_PARAM}}', location: 'insert' },
                    z: { primitive: 'string()', options: [] }
                }
            ]
        },
        searchUsers: {
            method: 'GET',
            path: '/users',
            description: 'Search users.',
            parameters: [
                {
                    position: { key: 'q', value: '{{USER_PARAM}}', location: 'query' },
                    z: { primitive: 'string()', options: [] }
                }
            ]
        }
    }
}


describe( 'Fetch', () => {
    describe( 'execute()', () => {
        test( 'returns error when route not found', async () => {
            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap: {},
                    userParams: {},
                    serverParams: {},
                    routeName: 'nonExistent'
                } )

            expect( struct['status'] ).toBe( false )
            expect( struct['messages'][ 0 ] ).toContain( 'not found' )
        } )


        test( 'executes a simple GET request', async () => {
            global.fetch = jest.fn( () => {
                const response = Promise.resolve( {
                    ok: true,
                    json: () => Promise.resolve( { status: 'ok' } )
                } )

                return response
            } )

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap: { getStatus: { preRequest: null, postRequest: null } },
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'] ).toEqual( { status: 'ok' } )
            expect( struct['dataAsString'] ).toBe( '{"status":"ok"}' )
            expect( global.fetch ).toHaveBeenCalledWith(
                'https://api.example.com/status',
                expect.objectContaining( { method: 'GET' } )
            )
        } )


        test( 'replaces insert parameters in URL', async () => {
            global.fetch = jest.fn( () => {
                const response = Promise.resolve( {
                    ok: true,
                    json: () => Promise.resolve( { id: '42', name: 'Alice' } )
                } )

                return response
            } )

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap: { getUser: { preRequest: null, postRequest: null } },
                    userParams: { userId: '42' },
                    serverParams: {},
                    routeName: 'getUser'
                } )

            expect( struct['status'] ).toBe( true )
            expect( global.fetch ).toHaveBeenCalledWith(
                'https://api.example.com/users/42',
                expect.objectContaining( { method: 'GET' } )
            )
        } )


        test( 'appends query parameters to URL', async () => {
            global.fetch = jest.fn( () => {
                const response = Promise.resolve( {
                    ok: true,
                    json: () => Promise.resolve( [] )
                } )

                return response
            } )

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap: { searchUsers: { preRequest: null, postRequest: null } },
                    userParams: { q: 'alice' },
                    serverParams: {},
                    routeName: 'searchUsers'
                } )

            expect( struct['status'] ).toBe( true )
            expect( global.fetch ).toHaveBeenCalledWith(
                'https://api.example.com/users?q=alice',
                expect.objectContaining( { method: 'GET' } )
            )
        } )


        test( 'runs postRequest handler on response', async () => {
            global.fetch = jest.fn( () => {
                const response = Promise.resolve( {
                    ok: true,
                    json: () => Promise.resolve( { raw: 'data' } )
                } )

                return response
            } )

            const handlerMap = {
                getStatus: {
                    preRequest: null,
                    postRequest: async ( { response, struct, payload } ) => {
                        const transformed = { ...response, processed: true }

                        return { response: transformed }
                    }
                }
            }

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap,
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data']['processed'] ).toBe( true )
            expect( struct['data']['raw'] ).toBe( 'data' )
        } )


        test( 'handles HTTP error responses', async () => {
            global.fetch = jest.fn( () => {
                const response = Promise.resolve( {
                    ok: false,
                    status: 404,
                    statusText: 'Not Found'
                } )

                return response
            } )

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap: { getStatus: { preRequest: null, postRequest: null } },
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( false )

            const hasHttpError = struct['messages']
                .some( ( msg ) => {
                    const match = msg.includes( '404' )

                    return match
                } )

            expect( hasHttpError ).toBe( true )
        } )


        test( 'handles network errors', async () => {
            global.fetch = jest.fn( () => {
                const rejection = Promise.reject( new TypeError( 'fetch failed' ) )

                return rejection
            } )

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap: { getStatus: { preRequest: null, postRequest: null } },
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( false )
            expect( struct['messages'].length ).toBeGreaterThan( 0 )
        } )


        test( 'skips HTTP fetch when executeRequest handler is present', async () => {
            global.fetch = jest.fn()

            const handlerMap = {
                getStatus: {
                    preRequest: null,
                    executeRequest: async ( { struct, payload } ) => {
                        const response = { price: 1234.56, chain: 'ethereum' }

                        return { response }
                    },
                    postRequest: null
                }
            }

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap,
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'] ).toEqual( { price: 1234.56, chain: 'ethereum' } )
            expect( global.fetch ).not.toHaveBeenCalled()
        } )


        test( 'passes userParams and serverParams to executeRequest', async () => {
            let receivedPayload = null

            const handlerMap = {
                getStatus: {
                    preRequest: null,
                    executeRequest: async ( { struct, payload } ) => {
                        receivedPayload = payload

                        return { response: { ok: true } }
                    },
                    postRequest: null
                }
            }

            await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap,
                    userParams: { feedName: 'ETH/USD' },
                    serverParams: { INFURA_API_KEY: 'abc123' },
                    routeName: 'getStatus'
                } )

            expect( receivedPayload['userParams'] ).toEqual( { feedName: 'ETH/USD' } )
            expect( receivedPayload['serverParams'] ).toEqual( { INFURA_API_KEY: 'abc123' } )
            expect( receivedPayload['url'] ).toContain( 'api.example.com' )
        } )


        test( 'runs postRequest after executeRequest', async () => {
            const handlerMap = {
                getStatus: {
                    preRequest: null,
                    executeRequest: async ( { struct, payload } ) => {
                        return { response: { raw: 'rpc-data' } }
                    },
                    postRequest: async ( { response } ) => {
                        return { response: { ...response, enriched: true } }
                    }
                }
            }

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap,
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data']['raw'] ).toBe( 'rpc-data' )
            expect( struct['data']['enriched'] ).toBe( true )
        } )


        test( 'handles executeRequest errors gracefully', async () => {
            const handlerMap = {
                getStatus: {
                    preRequest: null,
                    executeRequest: async () => {
                        throw new Error( 'RPC call failed' )
                    },
                    postRequest: null
                }
            }

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap,
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( false )

            const hasExecError = struct['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'executeRequest' )

                    return match
                } )

            expect( hasExecError ).toBe( true )
        } )


        test( 'executeRequest can modify struct directly', async () => {
            const handlerMap = {
                getStatus: {
                    preRequest: null,
                    executeRequest: async ( { struct, payload } ) => {
                        struct['data'] = { directResult: true }

                        return { struct }
                    },
                    postRequest: null
                }
            }

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap,
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( true )
            expect( struct['data'] ).toEqual( { directResult: true } )
        } )


        test( 'handles preRequest handler errors gracefully', async () => {
            const handlerMap = {
                getStatus: {
                    preRequest: async () => {
                        throw new Error( 'PreRequest failed' )
                    },
                    postRequest: null
                }
            }

            const { struct } = await Fetch
                .execute( {
                    main: minimalMain,
                    handlerMap,
                    userParams: {},
                    serverParams: {},
                    routeName: 'getStatus'
                } )

            expect( struct['status'] ).toBe( false )

            const hasPreError = struct['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'preRequest' )

                    return match
                } )

            expect( hasPreError ).toBe( true )
        } )
    } )


    describe( 'stringifyResponseData()', () => {
        test( 'stringifies JSON data', () => {
            const { dataAsString } = Fetch
                .stringifyResponseData( { data: { key: 'value' } } )

            expect( dataAsString ).toBe( '{"key":"value"}' )
        } )


        test( 'handles null data', () => {
            const { dataAsString } = Fetch
                .stringifyResponseData( { data: null } )

            expect( dataAsString ).toBe( 'null' )
        } )
    } )
} )
