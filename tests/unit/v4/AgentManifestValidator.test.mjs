import { describe, it, expect } from '@jest/globals'
import { AgentManifestValidator } from '../../../src/v4/task/AgentManifestValidator.mjs'


const baseManifest = {
    name: 'test-agent',
    description: 'A test agent for validation',
    model: 'anthropic/claude-haiku-4-5',
    version: 'flowmcp/3.0.0',
    systemPrompt: 'You are a test agent.',
    tools: { 'etherscan-io/tool/getAbi': null },
    tests: [
        { _description: 't1', input: 'go', expectedTools: [ 'etherscan-io/tool/getAbi' ] },
        { _description: 't2', input: 'go', expectedTools: [ 'etherscan-io/tool/getAbi' ] },
        { _description: 't3', input: 'go', expectedTools: [ 'etherscan-io/tool/getAbi' ] }
    ]
}


describe( 'AgentManifestValidator (v4)', () => {
    describe( 'validate() — base behavior (additive compatibility)', () => {
        it( 'accepts a valid v2-compatible manifest without selections/elicitation', () => {
            const { status, messages } = AgentManifestValidator.validate( { manifest: baseManifest } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'rejects undefined manifest', () => {
            const { status, messages } = AgentManifestValidator.validate( { manifest: undefined } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Missing value' ) ) ).toBe( true )
        } )

        it( 'rejects non-object manifest', () => {
            const { status, messages } = AgentManifestValidator.validate( { manifest: 'not-an-object' } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'plain object' ) ) ).toBe( true )
        } )

        it( 'rejects manifest with missing required field "name"', () => {
            const manifest = { ...baseManifest }
            delete manifest[ 'name' ]
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'manifest.name' ) ) ).toBe( true )
        } )

        it( 'rejects manifest with wrong version string', () => {
            const manifest = { ...baseManifest, version: 'flowmcp/2.0.0' }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'manifest.version' ) ) ).toBe( true )
        } )

        it( 'rejects manifest with fewer than 3 tests', () => {
            const manifest = {
                ...baseManifest,
                tests: [
                    { _description: 't1', input: 'go', expectedTools: [ 'etherscan-io/tool/getAbi' ] }
                ]
            }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Minimum 3 tests required' ) ) ).toBe( true )
        } )
    } )


    describe( 'AGT010 — selections[] validation', () => {
        it( 'accepts manifest without selections field (optional)', () => {
            const { status, messages } = AgentManifestValidator.validate( { manifest: baseManifest } )

            expect( status ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) ) ).toBe( false )
        } )

        it( 'accepts manifest with selections: null (treated as not set)', () => {
            const manifest = { ...baseManifest, selections: null }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) ) ).toBe( false )
        } )

        it( 'accepts manifest with empty selections array', () => {
            const manifest = { ...baseManifest, selections: [] }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) ) ).toBe( false )
        } )

        it( 'accepts manifest with valid selection IDs', () => {
            const manifest = {
                ...baseManifest,
                selections: [ 'evm-research/selection/contract-analysis' ]
            }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'AGT010: rejects when selections is a string instead of array', () => {
            const manifest = { ...baseManifest, selections: 'nope' }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) && m.includes( 'Must be an array' ) ) ).toBe( true )
        } )

        it( 'AGT010: rejects when selections is an object instead of array', () => {
            const manifest = { ...baseManifest, selections: { id: 'evm-research/selection/x' } }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) && m.includes( 'Must be an array' ) ) ).toBe( true )
        } )

        it( 'AGT010: rejects non-string entry in selections array', () => {
            const manifest = { ...baseManifest, selections: [ 123 ] }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) && m.includes( 'Must be type "string"' ) ) ).toBe( true )
        } )

        it( 'AGT010: rejects ID without "/" separator', () => {
            const manifest = { ...baseManifest, selections: [ 'invalid-id-no-slash' ] }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) ) ).toBe( true )
        } )

        it( 'AGT010: rejects ID with wrong type segment (not "selection")', () => {
            const manifest = {
                ...baseManifest,
                selections: [ 'evm-research/tool/contract-analysis' ]
            }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) && m.includes( 'selection ID of form' ) ) ).toBe( true )
        } )

        it( 'AGT010: rejects two-segment ID (namespace/name without type)', () => {
            const manifest = {
                ...baseManifest,
                selections: [ 'evm-research/contract-analysis' ]
            }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) && m.includes( 'selection ID of form' ) ) ).toBe( true )
        } )

        it( 'AGT010: reports index of each invalid selection entry', () => {
            const manifest = {
                ...baseManifest,
                selections: [
                    'evm-research/selection/valid-one',
                    'evm-research/tool/wrong-type',
                    123
                ]
            }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'manifest.selections[1]' ) ) ).toBe( true )
            expect( messages.some( ( m ) => m.includes( 'manifest.selections[2]' ) ) ).toBe( true )
        } )
    } )


    describe( 'AGT011 — elicitation validation', () => {
        it( 'accepts manifest without elicitation field (optional)', () => {
            const { status, messages } = AgentManifestValidator.validate( { manifest: baseManifest } )

            expect( status ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) ) ).toBe( false )
        } )

        it( 'accepts manifest with elicitation: null (treated as not set)', () => {
            const manifest = { ...baseManifest, elicitation: null }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) ) ).toBe( false )
        } )

        it( 'accepts manifest with elicitation.maxRounds = 5', () => {
            const manifest = { ...baseManifest, elicitation: { maxRounds: 5 } }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'accepts manifest with elicitation.maxRounds = 1 (smallest positive int)', () => {
            const manifest = { ...baseManifest, elicitation: { maxRounds: 1 } }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'AGT011: rejects elicitation when it is an array', () => {
            const manifest = { ...baseManifest, elicitation: [ 'a', 'b' ] }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) && m.includes( 'plain object' ) ) ).toBe( true )
        } )

        it( 'AGT011: rejects elicitation when it is a string', () => {
            const manifest = { ...baseManifest, elicitation: 'invalid' }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) && m.includes( 'plain object' ) ) ).toBe( true )
        } )

        it( 'AGT011: rejects elicitation with missing maxRounds', () => {
            const manifest = { ...baseManifest, elicitation: {} }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) && m.includes( 'Missing required field' ) ) ).toBe( true )
        } )

        it( 'AGT011: rejects elicitation.maxRounds = 0', () => {
            const manifest = { ...baseManifest, elicitation: { maxRounds: 0 } }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) && m.includes( 'positive integer' ) ) ).toBe( true )
        } )

        it( 'AGT011: rejects elicitation.maxRounds = -1', () => {
            const manifest = { ...baseManifest, elicitation: { maxRounds: -1 } }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) && m.includes( 'positive integer' ) ) ).toBe( true )
        } )

        it( 'AGT011: rejects elicitation.maxRounds = 1.5 (not integer)', () => {
            const manifest = { ...baseManifest, elicitation: { maxRounds: 1.5 } }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) && m.includes( 'positive integer' ) ) ).toBe( true )
        } )

        it( 'AGT011: rejects elicitation.maxRounds as string', () => {
            const manifest = { ...baseManifest, elicitation: { maxRounds: '5' } }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) && m.includes( 'positive integer' ) ) ).toBe( true )
        } )
    } )


    describe( 'combined v4 features', () => {
        it( 'accepts manifest with both selections and elicitation', () => {
            const manifest = {
                ...baseManifest,
                selections: [ 'evm-research/selection/contract-analysis' ],
                elicitation: { maxRounds: 3 }
            }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'reports both AGT010 and AGT011 when both fields are invalid', () => {
            const manifest = {
                ...baseManifest,
                selections: 'wrong-type',
                elicitation: { maxRounds: 0 }
            }
            const { status, messages } = AgentManifestValidator.validate( { manifest } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'AGT010' ) ) ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'AGT011' ) ) ).toBe( true )
        } )
    } )
} )
