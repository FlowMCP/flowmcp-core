import { describe, test, expect } from '@jest/globals'
import { HandlerFactory } from '../../src/v2/task/HandlerFactory.mjs'


describe( 'HandlerFactory', () => {
    describe( 'create()', () => {
        test( 'creates null handlers when no handlersFn provided', () => {
            const { handlerMap } = HandlerFactory
                .create( {
                    handlersFn: null,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getStatus' ]
                } )

            expect( handlerMap['getStatus'] ).toBeDefined()
            expect( handlerMap['getStatus']['preRequest'] ).toBeNull()
            expect( handlerMap['getStatus']['postRequest'] ).toBeNull()
        } )


        test( 'creates handler map from factory function', () => {
            const factory = ( { sharedLists, libraries } ) => ( {
                getUser: {
                    postRequest: async ( { response } ) => {
                        return { response }
                    }
                }
            } )

            const { handlerMap } = HandlerFactory
                .create( {
                    handlersFn: factory,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getUser' ]
                } )

            expect( handlerMap['getUser'] ).toBeDefined()
            expect( typeof handlerMap['getUser']['postRequest'] ).toBe( 'function' )
            expect( handlerMap['getUser']['preRequest'] ).toBeNull()
        } )


        test( 'creates handler map with both pre and post handlers', () => {
            const factory = ( { sharedLists, libraries } ) => ( {
                getUser: {
                    preRequest: async ( { struct, payload } ) => ( { struct, payload } ),
                    postRequest: async ( { response } ) => ( { response } )
                }
            } )

            const { handlerMap } = HandlerFactory
                .create( {
                    handlersFn: factory,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getUser' ]
                } )

            expect( typeof handlerMap['getUser']['preRequest'] ).toBe( 'function' )
            expect( typeof handlerMap['getUser']['postRequest'] ).toBe( 'function' )
        } )


        test( 'sets null for routes without handlers', () => {
            const factory = ( { sharedLists, libraries } ) => ( {} )

            const { handlerMap } = HandlerFactory
                .create( {
                    handlersFn: factory,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getStatus' ]
                } )

            expect( handlerMap['getStatus']['preRequest'] ).toBeNull()
            expect( handlerMap['getStatus']['postRequest'] ).toBeNull()
        } )


        test( 'passes sharedLists and libraries to factory', () => {
            const testSharedLists = { chains: [ { id: 1 } ] }
            const testLibraries = { ethers: { version: '6.0' } }
            let receivedDeps = null

            const factory = ( deps ) => {
                receivedDeps = deps

                return {}
            }

            HandlerFactory
                .create( {
                    handlersFn: factory,
                    sharedLists: testSharedLists,
                    libraries: testLibraries,
                    routeNames: []
                } )

            expect( receivedDeps['sharedLists'] ).toBe( testSharedLists )
            expect( receivedDeps['libraries'] ).toBe( testLibraries )
        } )


        test( 'creates handler map with executeRequest handler', () => {
            const factory = ( { sharedLists, libraries } ) => ( {
                getUser: {
                    executeRequest: async ( { struct, payload } ) => {
                        return { response: { custom: true } }
                    }
                }
            } )

            const { handlerMap } = HandlerFactory
                .create( {
                    handlersFn: factory,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getUser' ]
                } )

            expect( typeof handlerMap['getUser']['executeRequest'] ).toBe( 'function' )
            expect( handlerMap['getUser']['preRequest'] ).toBeNull()
            expect( handlerMap['getUser']['postRequest'] ).toBeNull()
        } )


        test( 'sets executeRequest to null when not provided', () => {
            const factory = ( { sharedLists, libraries } ) => ( {
                getUser: {
                    postRequest: async ( { response } ) => ( { response } )
                }
            } )

            const { handlerMap } = HandlerFactory
                .create( {
                    handlersFn: factory,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getUser' ]
                } )

            expect( handlerMap['getUser']['executeRequest'] ).toBeNull()
        } )


        test( 'throws when handler key does not match any route', () => {
            const factory = ( { sharedLists, libraries } ) => ( {
                unknownRoute: {
                    preRequest: async ( { struct, payload } ) => ( { struct, payload } )
                }
            } )

            expect( () => {
                HandlerFactory.create( {
                    handlersFn: factory,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getUser' ]
                } )
            } ).toThrow( 'unknownRoute' )
        } )


        test( 'throws when factory returns non-object', () => {
            const factory = ( { sharedLists, libraries } ) => {
                return 'not an object'
            }

            expect( () => {
                HandlerFactory.create( {
                    handlersFn: factory,
                    sharedLists: {},
                    libraries: {},
                    routeNames: [ 'getUser' ]
                } )
            } ).toThrow( 'plain object' )
        } )
    } )
} )
