import { describe, it, expect } from '@jest/globals'
import { SkillContentGenerator } from '../../../src/v4/task/SkillContentGenerator.mjs'


const sampleSchema = {
    namespace: 'etherscan-io',
    tools: {
        getSmartContractAbi: {
            description: 'Returns the ABI for a verified smart contract.',
            method: 'GET',
            parameters: [
                {
                    position: { key: 'address' },
                    z: { primitive: 'string()', options: [] },
                    description: 'Contract address'
                },
                {
                    position: { key: 'apiKey' },
                    z: { primitive: 'string()', options: [ 'optional(true)' ] },
                    description: 'API Key'
                }
            ],
            tests: [
                { params: { address: '0xabc' } }
            ],
            meta: {
                isReadOnly: true,
                alwaysLoad: false,
                searchHint: 'ABI lookup for verified contracts'
            }
        }
    }
}


describe( 'SkillContentGenerator', () => {
    describe( 'generate()', () => {
        it( 'returns a contentMap as Map', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            expect( contentMap ).toBeInstanceOf( Map )
        } )

        it( 'produces 5 entries per tool (full + parameters + test + call + meta)', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            expect( contentMap.size ).toBe( 5 )
        } )

        it( 'emits full block under {{tool:ns/name}} with heading + parameters', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const full = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi}}' )
            expect( typeof full ).toBe( 'string' )
            expect( full ).toContain( 'etherscan-io/getSmartContractAbi' )
            expect( full ).toContain( '| Key | Type | Required | Description |' )
            expect( full ).toContain( 'flowmcp call etherscan-io/getSmartContractAbi' )
        } )

        it( 'emits parameters table under :parameters', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const params = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi:parameters}}' )
            expect( params ).toContain( '| address | string() | yes |' )
            expect( params ).toContain( '| apiKey | string() | no |' )
        } )

        it( 'emits test JSON under :test', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const test = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi:test}}' )
            expect( test ).toContain( '"address": "0xabc"' )
        } )

        it( 'emits flowmcp call under :call', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const call = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi:call}}' )
            expect( call ).toBe( `flowmcp call etherscan-io/getSmartContractAbi '{"address":"0xabc"}'` )
        } )

        it( 'emits meta single-liner under :meta', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const meta = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi:meta}}' )
            expect( meta ).toContain( 'isReadOnly: true' )
            expect( meta ).toContain( 'alwaysLoad: false' )
            expect( meta ).toContain( 'searchHint: ABI lookup for verified contracts' )
        } )

        it( 'returns empty map when schemas array is empty', () => {
            const { contentMap } = SkillContentGenerator.generate( { schemas: [] } )
            expect( contentMap.size ).toBe( 0 )
        } )

        it( 'skips schemas without namespace', () => {
            const broken = { tools: { x: { description: 'x' } } }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ broken ] } )
            expect( contentMap.size ).toBe( 0 )
        } )

        it( 'skips schemas with empty namespace string', () => {
            const broken = { namespace: '', tools: { x: { description: 'x' } } }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ broken ] } )
            expect( contentMap.size ).toBe( 0 )
        } )

        it( 'skips schemas without tools', () => {
            const broken = { namespace: 'demo' }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ broken ] } )
            expect( contentMap.size ).toBe( 0 )
        } )

        it( 'handles tools without parameters gracefully', () => {
            const schema = {
                namespace: 'demo',
                tools: { ping: { description: 'ping', tests: [] } }
            }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ schema ] } )
            const params = contentMap.get( '{{tool:demo/ping:parameters}}' )
            expect( params ).toBe( '_No parameters._' )
        } )

        it( 'emits placeholder test message when tests array is empty', () => {
            const schema = {
                namespace: 'demo',
                tools: { ping: { description: 'ping', tests: [] } }
            }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ schema ] } )
            const test = contentMap.get( '{{tool:demo/ping:test}}' )
            expect( test ).toBe( '_No test example available._' )
        } )

        it( 'emits flowmcp call with empty params when no tests are defined', () => {
            const schema = {
                namespace: 'demo',
                tools: { ping: { description: 'ping' } }
            }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ schema ] } )
            const call = contentMap.get( '{{tool:demo/ping:call}}' )
            expect( call ).toBe( `flowmcp call demo/ping '{}'` )
        } )

        it( 'emits unknown meta flags when meta is missing', () => {
            const schema = {
                namespace: 'demo',
                tools: { ping: { description: 'ping' } }
            }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ schema ] } )
            const meta = contentMap.get( '{{tool:demo/ping:meta}}' )
            expect( meta ).toContain( 'isReadOnly: unknown' )
            expect( meta ).toContain( 'alwaysLoad: unknown' )
            expect( meta ).toContain( 'searchHint: ' )
        } )

        it( 'produces 10 entries for two tools in one schema', () => {
            const schema = {
                namespace: 'demo',
                tools: {
                    a: { description: 'A' },
                    b: { description: 'B' }
                }
            }
            const { contentMap } = SkillContentGenerator.generate( { schemas: [ schema ] } )
            expect( contentMap.size ).toBe( 10 )
            expect( contentMap.has( '{{tool:demo/a}}' ) ).toBe( true )
            expect( contentMap.has( '{{tool:demo/b:call}}' ) ).toBe( true )
        } )

        it( 'aggregates entries across multiple schemas', () => {
            const schemaA = { namespace: 'ns1', tools: { x: { description: 'X' } } }
            const schemaB = { namespace: 'ns2', tools: { y: { description: 'Y' } } }
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ schemaA, schemaB ]
            } )
            expect( contentMap.size ).toBe( 10 )
            expect( contentMap.has( '{{tool:ns1/x}}' ) ).toBe( true )
            expect( contentMap.has( '{{tool:ns2/y:parameters}}' ) ).toBe( true )
        } )

        it( 'accepts sharedLists parameter without throwing', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ],
                sharedLists: { chains: { eth: '1' } }
            } )
            expect( contentMap.size ).toBe( 5 )
        } )

        it( 'works without sharedLists (defaults to empty object)', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            expect( contentMap.size ).toBe( 5 )
        } )

        it( 'throws when schemas is not an array', () => {
            expect( () => SkillContentGenerator.generate( { schemas: 'oops' } ) )
                .toThrow( /schemas must be an array/ )
        } )

        it( 'throws when schemas is undefined', () => {
            expect( () => SkillContentGenerator.generate( {} ) )
                .toThrow( /schemas must be an array/ )
        } )

        it( 'full block contains description text', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const full = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi}}' )
            expect( full ).toContain( 'Returns the ABI for a verified smart contract.' )
        } )

        it( 'full block contains heading line prefixed with ###', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const full = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi}}' )
            expect( full ).toContain( '### etherscan-io/getSmartContractAbi' )
        } )

        it( ':test wraps JSON in fenced json code block', () => {
            const { contentMap } = SkillContentGenerator.generate( {
                schemas: [ sampleSchema ]
            } )
            const test = contentMap.get( '{{tool:etherscan-io/getSmartContractAbi:test}}' )
            expect( test.startsWith( '```json' ) ).toBe( true )
            expect( test.endsWith( '```' ) ).toBe( true )
        } )
    } )
} )
