import { describe, test, expect } from '@jest/globals'
import { LegacyAdapter } from '../../src/v2/task/LegacyAdapter.mjs'


describe( 'LegacyAdapter', () => {
    describe( 'detect()', () => {
        test( 'detects a v2 module as not legacy', () => {
            const module = {
                main: { version: '2.0.0', namespace: 'test' }
            }
            const { isLegacy, format } = LegacyAdapter
                .detect( { module } )

            expect( isLegacy ).toBe( false )
            expect( format ).toBe( 'v2' )
        } )


        test( 'detects a v1.2.0 module as legacy', () => {
            const module = {
                schema: { flowMCP: '1.2.0', namespace: 'test' }
            }
            const { isLegacy, format } = LegacyAdapter
                .detect( { module } )

            expect( isLegacy ).toBe( true )
            expect( format ).toBe( 'v1.2.0' )
        } )


        test( 'detects a v1.0.0 module as legacy', () => {
            const module = {
                schema: { flowMCP: '1.0.0', namespace: 'test' }
            }
            const { isLegacy, format } = LegacyAdapter
                .detect( { module } )

            expect( isLegacy ).toBe( true )
            expect( format ).toBe( 'v1.0.0' )
        } )


        test( 'returns unknown for unrecognized format', () => {
            const module = { something: 'else' }
            const { isLegacy, format } = LegacyAdapter
                .detect( { module } )

            expect( isLegacy ).toBe( false )
            expect( format ).toBe( 'unknown' )
        } )
    } )


    describe( 'adapt()', () => {
        test( 'converts a minimal v1.2.0 schema to v2 format', () => {
            const legacySchema = {
                flowMCP: '1.2.0',
                namespace: 'etherscan',
                name: 'Etherscan',
                description: 'Etherscan API',
                root: 'https://api.etherscan.io',
                requiredServerParams: [ 'API_KEY' ],
                headers: { 'Content-Type': 'application/json' },
                routes: {
                    getBalance: {
                        requestMethod: 'GET',
                        route: '/api?module=account&action=balance',
                        description: 'Get account balance.',
                        parameters: [
                            {
                                position: { key: 'address', value: '{{USER_PARAM}}', location: 'query' },
                                z: { primitive: 'string()', options: [] }
                            }
                        ],
                        modifiers: [],
                        tests: []
                    }
                },
                handlers: {}
            }

            const { main, handlersFn, hasHandlers, warnings } = LegacyAdapter
                .adapt( { legacySchema } )

            expect( main['namespace'] ).toBe( 'etherscan' )
            expect( main['version'] ).toBe( '2.0.0' )
            expect( main['routes']['getBalance']['method'] ).toBe( 'GET' )
            expect( main['routes']['getBalance']['path'] ).toBe( '/api?module=account&action=balance' )
            expect( main['requiredServerParams'] ).toEqual( [ 'API_KEY' ] )
            expect( hasHandlers ).toBe( false )
            expect( warnings.length ).toBeGreaterThan( 0 )
        } )


        test( 'converts modifiers to v2 handler format', () => {
            const modifierFn = ( { struct, payload } ) => {
                struct['data'] = { transformed: true }

                return { struct, payload }
            }

            const legacySchema = {
                flowMCP: '1.2.0',
                namespace: 'test',
                name: 'Test',
                description: 'Test',
                root: 'https://api.test.com',
                routes: {
                    getData: {
                        requestMethod: 'GET',
                        route: '/data',
                        description: 'Get data.',
                        parameters: [],
                        modifiers: [
                            { phase: 'post', handlerName: 'transformData' }
                        ],
                        tests: []
                    }
                },
                handlers: {
                    transformData: modifierFn
                }
            }

            const { main, handlersFn, hasHandlers, warnings } = LegacyAdapter
                .adapt( { legacySchema } )

            expect( hasHandlers ).toBe( true )
            expect( main['routes']['getData']['method'] ).toBe( 'GET' )
            expect( main['routes']['getData']['path'] ).toBe( '/data' )
        } )


        test( 'converts inline modifier functions', () => {
            const inlineFn = ( { struct, payload } ) => {
                struct['data'] = { balance: struct['data']['result'] }

                return { struct, payload }
            }

            const legacySchema = {
                flowMCP: '1.2.0',
                namespace: 'test',
                name: 'Test',
                description: 'Test',
                root: 'https://api.test.com',
                routes: {
                    getBalance: {
                        requestMethod: 'GET',
                        route: '/balance',
                        description: 'Get balance.',
                        parameters: [],
                        modifiers: [
                            { phase: 'post', fn: inlineFn }
                        ],
                        tests: []
                    }
                },
                handlers: {}
            }

            const { hasHandlers } = LegacyAdapter
                .adapt( { legacySchema } )

            expect( hasHandlers ).toBe( true )
        } )


        test( 'converts execute phase modifier to executeRequest handler', () => {
            const executeFn = async ( { struct, payload, userParams } ) => {
                struct['data'] = { price: 1234.56, chain: 'ethereum' }

                return { struct, payload }
            }

            const legacySchema = {
                flowMCP: '1.2.0',
                namespace: 'chainlink',
                name: 'Chainlink',
                description: 'Oracle price feeds',
                root: 'https://rpc.example.com',
                routes: {
                    getLatestPrice: {
                        requestMethod: 'GET',
                        route: '/',
                        description: 'Get latest price.',
                        parameters: [],
                        modifiers: [
                            { phase: 'execute', handlerName: 'getLatestPrice' }
                        ],
                        tests: []
                    }
                },
                handlers: {
                    getLatestPrice: executeFn
                }
            }

            const { main, handlersFn, hasHandlers } = LegacyAdapter
                .adapt( { legacySchema } )

            expect( hasHandlers ).toBe( true )

            const handlerMap = handlersFn( { sharedLists: {}, libraries: {} } )

            expect( typeof handlerMap['getLatestPrice']['executeRequest'] ).toBe( 'function' )
            expect( handlerMap['getLatestPrice']['preRequest'] ).toBeUndefined()
            expect( handlerMap['getLatestPrice']['postRequest'] ).toBeUndefined()
        } )


        test( 'emits deprecation warning', () => {
            const legacySchema = {
                flowMCP: '1.2.0',
                namespace: 'test',
                name: 'Test',
                description: 'Test',
                root: 'https://api.test.com',
                routes: {},
                handlers: {}
            }

            const { warnings } = LegacyAdapter
                .adapt( { legacySchema } )

            const hasDeprecationWarning = warnings
                .some( ( w ) => {
                    const match = w.includes( 'v1.x' ) || w.includes( 'automatic conversion' )

                    return match
                } )

            expect( hasDeprecationWarning ).toBe( true )
        } )


        test( 'warns when handler reference is missing', () => {
            const legacySchema = {
                flowMCP: '1.2.0',
                namespace: 'test',
                name: 'Test',
                description: 'Test',
                root: 'https://api.test.com',
                routes: {
                    getData: {
                        requestMethod: 'GET',
                        route: '/data',
                        description: 'Get data.',
                        parameters: [],
                        modifiers: [
                            { phase: 'post', handlerName: 'missingHandler' }
                        ],
                        tests: []
                    }
                },
                handlers: {}
            }

            const { warnings } = LegacyAdapter
                .adapt( { legacySchema } )

            const hasMissingWarning = warnings
                .some( ( w ) => {
                    const match = w.includes( 'missingHandler' ) && w.includes( 'not found' )

                    return match
                } )

            expect( hasMissingWarning ).toBe( true )
        } )
    } )
} )
