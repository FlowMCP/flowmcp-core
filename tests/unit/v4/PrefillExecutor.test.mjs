import { describe, it, expect } from '@jest/globals'
import { PrefillExecutor } from '../../../src/v4/task/PrefillExecutor.mjs'

describe( 'PrefillExecutor', () => {

    describe( 'execute() — parameter validation', () => {
        it( 'throws when timeout is missing', async () => {
            await expect( PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                fetchFn: async () => 'x'
            } ) ).rejects.toThrow( /timeout/ )
        } )

        it( 'throws when timeout is undefined', async () => {
            await expect( PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                fetchFn: async () => 'x',
                timeout: undefined
            } ) ).rejects.toThrow( /timeout/ )
        } )

        it( 'throws when timeout is zero', async () => {
            await expect( PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                fetchFn: async () => 'x',
                timeout: 0
            } ) ).rejects.toThrow( /positive number/ )
        } )

        it( 'throws when timeout is negative', async () => {
            await expect( PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                fetchFn: async () => 'x',
                timeout: -100
            } ) ).rejects.toThrow( /positive number/ )
        } )

        it( 'throws when timeout is not a number', async () => {
            await expect( PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                fetchFn: async () => 'x',
                timeout: '5000'
            } ) ).rejects.toThrow( /positive number/ )
        } )

        it( 'throws when fetchFn is missing', async () => {
            await expect( PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                timeout: 5000
            } ) ).rejects.toThrow( /fetchFn/ )
        } )

        it( 'throws when fetchFn is not a function', async () => {
            await expect( PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                fetchFn: 'not-a-function',
                timeout: 5000
            } ) ).rejects.toThrow( /fetchFn/ )
        } )

        it( 'throws when skill is missing', async () => {
            await expect( PrefillExecutor.execute( {
                userParams: {},
                fetchFn: async () => 'x',
                timeout: 5000
            } ) ).rejects.toThrow( /skill/ )
        } )

        it( 'throws when skill is null', async () => {
            await expect( PrefillExecutor.execute( {
                skill: null,
                userParams: {},
                fetchFn: async () => 'x',
                timeout: 5000
            } ) ).rejects.toThrow( /skill/ )
        } )
    } )

    describe( 'execute() — happy path', () => {
        it( 'returns empty Map when skill has no prefill', async () => {
            const { prefillResults } = await PrefillExecutor.execute( {
                skill: {},
                userParams: {},
                fetchFn: async () => 'should not be called',
                timeout: 5000
            } )
            expect( prefillResults ).toBeInstanceOf( Map )
            expect( prefillResults.size ).toBe( 0 )
        } )

        it( 'returns empty Map when skill.prefill is empty array', async () => {
            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [] },
                userParams: {},
                fetchFn: async () => 'should not be called',
                timeout: 5000
            } )
            expect( prefillResults.size ).toBe( 0 )
        } )

        it( 'returns empty Map when skill.prefill is not an array', async () => {
            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: 'invalid' },
                userParams: {},
                fetchFn: async () => 'should not be called',
                timeout: 5000
            } )
            expect( prefillResults.size ).toBe( 0 )
        } )

        it( 'stores successful prefill result', async () => {
            const fetchFn = async ( toolRef ) => `result for ${toolRef}`

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/myTool', params: { addr: '0x1' } } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/myTool' ) ).toBe( 'result for ns/myTool' )
        } )

        it( 'serializes non-string non-error result via JSON.stringify', async () => {
            const fetchFn = async () => ( { foo: 'bar', n: 42 } )

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/objectTool', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/objectTool' ) ).toBe( '{"foo":"bar","n":42}' )
        } )

        it( 'merges entry.params and userParams (userParams overrides)', async () => {
            const received = []
            const fetchFn = async ( toolRef, params ) => {
                received.push( { toolRef, params } )
                return 'ok'
            }

            await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/t', params: { a: 1, b: 2 } } ] },
                userParams: { b: 99, c: 3 },
                fetchFn,
                timeout: 5000
            } )

            expect( received[ 0 ].params ).toEqual( { a: 1, b: 99, c: 3 } )
        } )

        it( 'handles missing entry.params gracefully', async () => {
            const received = []
            const fetchFn = async ( toolRef, params ) => {
                received.push( params )
                return 'ok'
            }

            await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/t' } ] },
                userParams: { x: 1 },
                fetchFn,
                timeout: 5000
            } )

            expect( received[ 0 ] ).toEqual( { x: 1 } )
        } )

        it( 'handles missing userParams gracefully', async () => {
            const received = []
            const fetchFn = async ( toolRef, params ) => {
                received.push( params )
                return 'ok'
            }

            await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/t', params: { a: 1 } } ] },
                userParams: undefined,
                fetchFn,
                timeout: 5000
            } )

            expect( received[ 0 ] ).toEqual( { a: 1 } )
        } )
    } )

    describe( 'execute() — error handling', () => {
        it( 'stores error placeholder on fetchFn throw', async () => {
            const fetchFn = async () => { throw new Error( 'Network error' ) }

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/failTool', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/failTool' ) ).toContain( '[PREFILL ERROR:' )
            expect( prefillResults.get( 'ns/failTool' ) ).toContain( 'Network error' )
        } )

        it( 'stores error placeholder when fetchFn throws non-Error value', async () => {
            const fetchFn = async () => { throw 'string thrown' }

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/oddFail', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/oddFail' ) ).toContain( '[PREFILL ERROR:' )
            expect( prefillResults.get( 'ns/oddFail' ) ).toContain( 'string thrown' )
        } )

        it( 'stores timeout placeholder when fetchFn exceeds timeout', async () => {
            const fetchFn = () => new Promise( ( resolve ) => setTimeout( resolve, 200, 'late' ) )

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/slowTool', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 50
            } )

            expect( prefillResults.get( 'ns/slowTool' ) ).toContain( '[PREFILL ERROR: Timeout after 50ms' )
            expect( prefillResults.get( 'ns/slowTool' ) ).toContain( 'ns/slowTool' )
        } )

        it( 'stores HTTP error placeholder when fetchFn returns status object', async () => {
            const fetchFn = async () => ( { status: 403, statusText: 'Forbidden' } )

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/httpErrorTool', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/httpErrorTool' ) ).toBe( '[PREFILL ERROR: 403 Forbidden]' )
        } )

        it( 'stores HTTP error placeholder without statusText when missing', async () => {
            const fetchFn = async () => ( { status: 500 } )

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/httpNoText', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/httpNoText' ) ).toBe( '[PREFILL ERROR: 500]' )
        } )

        it( 'stores undefined placeholder when fetchFn returns undefined', async () => {
            const fetchFn = async () => undefined

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: 'ns/undefTool', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/undefTool' ) ).toContain( '[PREFILL ERROR:' )
            expect( prefillResults.get( 'ns/undefTool' ) ).toContain( 'undefined' )
        } )

        it( 'stores invalid-entry placeholder when entry has no tool field', async () => {
            const fetchFn = async () => 'ok'

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( '_invalid' ) ).toContain( `missing 'tool' field` )
        } )

        it( 'stores invalid-entry placeholder when entry tool is empty string', async () => {
            const fetchFn = async () => 'ok'

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ { tool: '', params: {} } ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( '_invalid' ) ).toContain( `missing 'tool' field` )
        } )

        it( 'stores invalid-entry placeholder when entry is not an object', async () => {
            const fetchFn = async () => 'ok'

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: { prefill: [ null ] },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( '_invalid' ) ).toContain( 'invalid entry' )
        } )
    } )

    describe( 'execute() — parallel execution', () => {
        it( 'executes multiple prefill entries in parallel', async () => {
            const calls = []
            const fetchFn = async ( toolRef ) => {
                calls.push( toolRef )
                return `ok:${toolRef}`
            }

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: {
                    prefill: [
                        { tool: 'ns/toolA', params: {} },
                        { tool: 'ns/toolB', params: {} }
                    ]
                },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/toolA' ) ).toBe( 'ok:ns/toolA' )
            expect( prefillResults.get( 'ns/toolB' ) ).toBe( 'ok:ns/toolB' )
            expect( calls ).toHaveLength( 2 )
        } )

        it( 'delivers all results even when some prefills fail', async () => {
            const fetchFn = async ( toolRef ) => {
                if( toolRef === 'ns/bad' ) { throw new Error( 'fail' ) }
                return 'good result'
            }

            const { prefillResults } = await PrefillExecutor.execute( {
                skill: {
                    prefill: [
                        { tool: 'ns/good', params: {} },
                        { tool: 'ns/bad', params: {} }
                    ]
                },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )

            expect( prefillResults.get( 'ns/good' ) ).toBe( 'good result' )
            expect( prefillResults.get( 'ns/bad' ) ).toContain( '[PREFILL ERROR:' )
        } )

        it( 'parallel execution finishes faster than sequential would', async () => {
            const fetchFn = ( toolRef ) => new Promise( ( resolve ) => {
                setTimeout( () => resolve( `done:${toolRef}` ), 100 )
            } )

            const start = Date.now()
            const { prefillResults } = await PrefillExecutor.execute( {
                skill: {
                    prefill: [
                        { tool: 'ns/a', params: {} },
                        { tool: 'ns/b', params: {} },
                        { tool: 'ns/c', params: {} }
                    ]
                },
                userParams: {},
                fetchFn,
                timeout: 5000
            } )
            const elapsed = Date.now() - start

            expect( prefillResults.size ).toBe( 3 )
            expect( elapsed ).toBeLessThan( 250 )
        } )
    } )

} )
