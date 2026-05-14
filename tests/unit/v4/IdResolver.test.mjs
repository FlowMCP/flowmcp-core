import { describe, it, expect } from '@jest/globals'
import { IdResolver } from '../../../src/v4/task/IdResolver.mjs'


describe( 'IdResolver (v4)', () => {
    describe( 'parse()', () => {
        it( 'parses namespace/name (2-segment)', () => {
            const result = IdResolver.parse( { id: 'evm-research/contract-analysis' } )
            expect( result.namespace ).toBe( 'evm-research' )
            expect( result.type ).toBe( null )
            expect( result.name ).toBe( 'contract-analysis' )
            expect( result.error ).toBeUndefined()
        } )

        it( 'parses namespace/type/name (3-segment) with tool', () => {
            const result = IdResolver.parse( { id: 'etherscan-io/tool/getAbi' } )
            expect( result.namespace ).toBe( 'etherscan-io' )
            expect( result.type ).toBe( 'tool' )
            expect( result.name ).toBe( 'getAbi' )
            expect( result.error ).toBeUndefined()
        } )

        it( 'parses namespace/selection/name', () => {
            const result = IdResolver.parse( { id: 'evm-research/selection/contract-analysis' } )
            expect( result.namespace ).toBe( 'evm-research' )
            expect( result.type ).toBe( 'selection' )
            expect( result.name ).toBe( 'contract-analysis' )
            expect( result.error ).toBeUndefined()
        } )

        it( 'returns error for null id', () => {
            const result = IdResolver.parse( { id: null } )
            expect( result.error ).toBe( 'ID must be a non-empty string' )
        } )

        it( 'returns error for undefined id', () => {
            const result = IdResolver.parse( { id: undefined } )
            expect( result.error ).toBe( 'ID must be a non-empty string' )
        } )

        it( 'returns error for non-string id', () => {
            const result = IdResolver.parse( { id: 123 } )
            expect( result.error ).toBe( 'ID must be a non-empty string' )
        } )

        it( 'returns error for empty string', () => {
            const result = IdResolver.parse( { id: '   ' } )
            expect( result.error ).toBe( 'ID must be a non-empty string' )
        } )

        it( 'returns error for id without separator', () => {
            const result = IdResolver.parse( { id: 'noseparator' } )
            expect( result.error ).toContain( 'ID001' )
        } )

        it( 'returns error for too many separators', () => {
            const result = IdResolver.parse( { id: 'a/b/c/d' } )
            expect( result.error ).toBe( 'ID contains too many "/" separators' )
        } )
    } )


    describe( 'validate()', () => {
        it( 'passes valid selection id', () => {
            const result = IdResolver.validate( { id: 'evm-research/selection/contract-analysis' } )
            expect( result.status ).toBe( true )
            expect( result.messages ).toHaveLength( 0 )
        } )

        it( 'passes valid tool id', () => {
            const result = IdResolver.validate( { id: 'etherscan-io/tool/getAbi' } )
            expect( result.status ).toBe( true )
        } )

        it( 'passes valid prompt id', () => {
            const result = IdResolver.validate( { id: 'my-namespace/prompt/myPrompt' } )
            expect( result.status ).toBe( true )
        } )

        it( 'passes valid resource id', () => {
            const result = IdResolver.validate( { id: 'my-namespace/resource/myResource' } )
            expect( result.status ).toBe( true )
        } )

        it( 'passes valid list id', () => {
            const result = IdResolver.validate( { id: 'my-namespace/list/myList' } )
            expect( result.status ).toBe( true )
        } )

        it( 'ID003: fails for unknown type', () => {
            const result = IdResolver.validate( { id: 'evm-research/bogus/contract-analysis' } )
            expect( result.status ).toBe( false )
            expect( result.messages.some( ( m ) => m.startsWith( 'ID003' ) ) ).toBe( true )
        } )

        it( 'ID003 message includes selection in allowed types', () => {
            const result = IdResolver.validate( { id: 'ns/bogus/name' } )
            const id003 = result.messages.find( ( m ) => m.startsWith( 'ID003' ) )
            expect( id003 ).toContain( 'selection' )
        } )

        it( 'ID001: fails for id without separator', () => {
            const result = IdResolver.validate( { id: 'noseparator' } )
            expect( result.status ).toBe( false )
            expect( result.messages.some( ( m ) => m.startsWith( 'ID001' ) ) ).toBe( true )
        } )

        it( 'ID001: fails for null id', () => {
            const result = IdResolver.validate( { id: null } )
            expect( result.status ).toBe( false )
            expect( result.messages.some( ( m ) => m.startsWith( 'ID001' ) ) ).toBe( true )
        } )

        it( 'ID002: fails for invalid namespace (uppercase)', () => {
            const result = IdResolver.validate( { id: 'BadNamespace/tool/name' } )
            expect( result.status ).toBe( false )
            expect( result.messages.some( ( m ) => m.startsWith( 'ID002' ) ) ).toBe( true )
        } )

        it( 'fails for too many separators', () => {
            const result = IdResolver.validate( { id: 'a/b/c/d' } )
            expect( result.status ).toBe( false )
        } )

        it( 'passes 2-segment id with valid namespace and name', () => {
            const result = IdResolver.validate( { id: 'my-ns/my-name' } )
            expect( result.status ).toBe( true )
        } )
    } )


    describe( 'resolve()', () => {
        const registry = {
            schemas: {
                'evm-research': {
                    filePath: '/tmp/evm-research.mjs',
                    selections: {
                        'contract-analysis': { whenToUse: 'analyze contracts' }
                    },
                    tools: {
                        'getStuff': { description: 'gets stuff' }
                    }
                },
                'etherscan-io': {
                    filePath: '/tmp/etherscan-io.mjs',
                    tools: {
                        'getAbi': { description: 'get abi' }
                    },
                    skills: {
                        'analyzePrompt': { description: 'analyze prompt' }
                    },
                    resources: {
                        'config': { description: 'config' }
                    },
                    lists: {
                        'allTools': { items: [] }
                    }
                }
            },
            agents: {
                'my-agent': {
                    filePath: '/tmp/agent.mjs',
                    tools: {
                        'doThing': { description: 'do thing' }
                    }
                }
            }
        }

        it( 'resolves selection via namespace/selection/name', () => {
            const result = IdResolver.resolve( { id: 'evm-research/selection/contract-analysis', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'selection' )
            expect( result.filePath ).toBe( '/tmp/evm-research.mjs' )
        } )

        it( 'resolves tool via namespace/tool/name', () => {
            const result = IdResolver.resolve( { id: 'etherscan-io/tool/getAbi', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'tool' )
            expect( result.filePath ).toBe( '/tmp/etherscan-io.mjs' )
        } )

        it( 'resolves prompt via namespace/prompt/name (maps to skills)', () => {
            const result = IdResolver.resolve( { id: 'etherscan-io/prompt/analyzePrompt', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'prompt' )
        } )

        it( 'resolves resource', () => {
            const result = IdResolver.resolve( { id: 'etherscan-io/resource/config', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'resource' )
        } )

        it( 'resolves list', () => {
            const result = IdResolver.resolve( { id: 'etherscan-io/list/allTools', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'list' )
        } )

        it( 'resolves agent via agents collection', () => {
            const result = IdResolver.resolve( { id: 'my-agent/tool/doThing', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'tool' )
        } )

        it( 'resolves selection type-free (2-segment) by name discovery', () => {
            const result = IdResolver.resolve( { id: 'evm-research/contract-analysis', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'selection' )
        } )

        it( 'resolves tool type-free (2-segment)', () => {
            const result = IdResolver.resolve( { id: 'etherscan-io/getAbi', registry } )
            expect( result.resolved ).toBe( true )
            expect( result.type ).toBe( 'tool' )
        } )

        it( 'fails when namespace not in registry', () => {
            const result = IdResolver.resolve( { id: 'unknown-ns/tool/foo', registry } )
            expect( result.resolved ).toBe( false )
            expect( result.error ).toContain( 'Namespace "unknown-ns" not found' )
        } )

        it( 'fails when name not in namespace', () => {
            const result = IdResolver.resolve( { id: 'evm-research/selection/nonexistent', registry } )
            expect( result.resolved ).toBe( false )
            expect( result.error ).toContain( 'not found' )
        } )

        it( 'fails when registry is null', () => {
            const result = IdResolver.resolve( { id: 'evm-research/selection/contract-analysis', registry: null } )
            expect( result.resolved ).toBe( false )
            expect( result.error ).toBe( 'Registry must be a valid object' )
        } )

        it( 'fails when registry is undefined', () => {
            const result = IdResolver.resolve( { id: 'evm-research/selection/contract-analysis', registry: undefined } )
            expect( result.resolved ).toBe( false )
            expect( result.error ).toBe( 'Registry must be a valid object' )
        } )

        it( 'propagates parse error', () => {
            const result = IdResolver.resolve( { id: null, registry } )
            expect( result.resolved ).toBe( false )
            expect( result.error ).toBe( 'ID must be a non-empty string' )
        } )

        it( 'fails when type maps to nonexistent collection', () => {
            const minimalRegistry = {
                schemas: {
                    'ns': { filePath: '/tmp/ns.mjs', tools: { 'name': {} } }
                }
            }
            const result = IdResolver.resolve( { id: 'ns/selection/name', registry: minimalRegistry } )
            expect( result.resolved ).toBe( false )
        } )
    } )
} )
