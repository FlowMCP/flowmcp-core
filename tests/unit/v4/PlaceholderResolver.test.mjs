import { describe, it, expect } from '@jest/globals'
import { PlaceholderResolver } from '../../../src/v4/task/PlaceholderResolver.mjs'

const minimalCatalog = {
    tools: new Map( [
        [ 'ns/myTool', {
            description: 'A test tool',
            parameters: { addr: { type: 'string', required: true, description: 'Address' } },
            tests: [ { params: { addr: '0x123' } } ],
            meta: { isReadOnly: true, isConcurrencySafe: true, isDestructive: false, alwaysLoad: false }
        } ]
    ] ),
    resources: new Map( [ [ 'ns/myResource', { description: 'A resource' } ] ] ),
    prompts: new Map( [ [ 'ns/myPrompt', { description: 'A prompt' } ] ] ),
    skills: new Map( [ [ 'mySkill', { description: 'A skill' } ] ] )
}

describe( 'PlaceholderResolver', () => {
    describe( 'resolve()', () => {
        it( 'resolves {{input:key}}', () => {
            const { resolved } = PlaceholderResolver.resolve( {
                content: 'Hello {{input:name}}',
                catalog: minimalCatalog,
                sharedLists: {},
                inputs: { name: 'World' },
                prefillResults: new Map()
            } )
            expect( resolved ).toBe( 'Hello World' )
        } )

        it( 'resolves {{tool:ns/myTool:description}}', () => {
            const { resolved } = PlaceholderResolver.resolve( {
                content: '{{tool:ns/myTool:description}}',
                catalog: minimalCatalog,
                sharedLists: {},
                inputs: {},
                prefillResults: new Map()
            } )
            expect( resolved ).toBe( 'A test tool' )
        } )

        it( 'resolves {{tool:ns/myTool:call}}', () => {
            const { resolved } = PlaceholderResolver.resolve( {
                content: '{{tool:ns/myTool:call}}',
                catalog: minimalCatalog,
                sharedLists: {},
                inputs: {},
                prefillResults: new Map()
            } )
            expect( resolved ).toContain( 'flowmcp call ns/myTool' )
        } )

        it( 'resolves {{prefill:ns/tool/name}} from prefillResults', () => {
            const prefillResults = new Map( [ [ 'ns/tool/name', 'prefilled value' ] ] )
            const { resolved } = PlaceholderResolver.resolve( {
                content: '{{prefill:ns/tool/name}}',
                catalog: minimalCatalog,
                sharedLists: {},
                inputs: {},
                prefillResults
            } )
            expect( resolved ).toBe( 'prefilled value' )
        } )

        it( 'resolves {{sharedList:alias}} from sharedLists', () => {
            const { resolved } = PlaceholderResolver.resolve( {
                content: '{{chains:ethereum}}',
                catalog: minimalCatalog,
                sharedLists: { chains: { ethereum: 'Ethereum Mainnet' } },
                inputs: {},
                prefillResults: new Map()
            } )
            expect( resolved ).toBe( 'Ethereum Mainnet' )
        } )

        it( 'replaces unknown tokens with ERROR placeholder', () => {
            const { resolved } = PlaceholderResolver.resolve( {
                content: '{{tool:ns/nonexistent}}',
                catalog: minimalCatalog,
                sharedLists: {},
                inputs: {},
                prefillResults: new Map()
            } )
            expect( resolved ).toContain( '[ERROR:' )
            expect( resolved ).not.toContain( '{{' )
        } )

        it( 'resolves all 12 token types without leaving unresolved {{ }}', () => {
            const prefillResults = new Map( [ [ 'ns/myTool/result', 'result-value' ] ] )
            const content = [
                '{{tool:ns/myTool}}',
                '{{tool:ns/myTool:description}}',
                '{{tool:ns/myTool:parameters}}',
                '{{tool:ns/myTool:test}}',
                '{{tool:ns/myTool:meta}}',
                '{{tool:ns/myTool:call}}',
                '{{resource:ns/myResource}}',
                '{{prompt:ns/myPrompt}}',
                '{{skill:mySkill}}',
                '{{input:myKey}}',
                '{{prefill:ns/myTool/result}}',
                '{{chains:ethereum}}'
            ].join( '\n' )

            const { resolved } = PlaceholderResolver.resolve( {
                content,
                catalog: minimalCatalog,
                sharedLists: { chains: { ethereum: 'Ethereum Mainnet' } },
                inputs: { myKey: 'inputValue' },
                prefillResults
            } )

            // No unresolved {{ }} — only [ERROR: ...] replacements allowed
            const unresolved = resolved.match( /\{\{[^}]+\}\}/g )
            expect( unresolved ).toBeNull()
        } )
    } )
} )
