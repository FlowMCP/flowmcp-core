import { describe, it, expect } from '@jest/globals'
import { SkillValidator } from '../../../src/v4/task/SkillValidator.mjs'


const buildValidSkill = ( overrides = {} ) => {
    const base = {
        name: 'contract-analysis',
        version: 'flowmcp/4.0.0',
        whenToUse: 'Use when user wants to inspect a smart contract',
        type: 'namespace-skill',
        description: 'Analyse a smart contract',
        content: 'Steps: 1. fetch abi 2. inspect',
        output: 'Markdown report'
    }

    return { ...base, ...overrides }
}


const runValidate = ( { skill, tools = [], resources = [], skillName = 'test-skill' } ) => {
    const skills = { [ skillName ]: skill }
    const result = SkillValidator.validate( { skills, tools, resources } )

    return result
}


describe( 'SkillValidator v4', () => {
    describe( 'validate()', () => {
        it( 'returns status=true for a valid skill', () => {
            const skill = buildValidSkill()
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'returns object with status and messages keys', () => {
            const result = runValidate( { skill: buildValidSkill() } )

            expect( result ).toHaveProperty( 'status' )
            expect( result ).toHaveProperty( 'messages' )
            expect( Array.isArray( result.messages ) ).toBe( true )
        } )

        it( 'handles empty skills object', () => {
            const { status, messages } = SkillValidator.validate( { skills: {}, tools: [], resources: [] } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )
    } )


    describe( 'SKL103 version', () => {
        it( 'fails when version is missing', () => {
            const skill = buildValidSkill( { version: undefined } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL103' ) ) ).toBe( true )
        } )

        it( 'fails when version is null', () => {
            const skill = buildValidSkill( { version: null } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL103' ) ) ).toBe( true )
        } )

        it( 'fails when version is the old v2 string flowmcp-skill/1.0.0', () => {
            const skill = buildValidSkill( { version: 'flowmcp-skill/1.0.0' } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL103' ) ) ).toBe( true )
        } )

        it( 'fails when version is an arbitrary string', () => {
            const skill = buildValidSkill( { version: 'flowmcp/3.0.0' } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL103' ) ) ).toBe( true )
        } )

        it( 'passes when version equals flowmcp/4.0.0', () => {
            const skill = buildValidSkill( { version: 'flowmcp/4.0.0' } )
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'SKL101 whenToUse', () => {
        it( 'fails when whenToUse is missing', () => {
            const skill = buildValidSkill( { whenToUse: undefined } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL101' ) ) ).toBe( true )
        } )

        it( 'fails when whenToUse is null', () => {
            const skill = buildValidSkill( { whenToUse: null } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL101' ) ) ).toBe( true )
        } )

        it( 'fails when whenToUse is not a string', () => {
            const skill = buildValidSkill( { whenToUse: 123 } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL101' ) ) ).toBe( true )
        } )

        it( 'fails when whenToUse is empty string', () => {
            const skill = buildValidSkill( { whenToUse: '' } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL101' ) ) ).toBe( true )
        } )

        it( 'fails when whenToUse is whitespace only', () => {
            const skill = buildValidSkill( { whenToUse: '   ' } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL101' ) ) ).toBe( true )
        } )
    } )


    describe( 'SKL102 type', () => {
        it( 'fails when type is missing', () => {
            const skill = buildValidSkill( { type: undefined } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL102' ) ) ).toBe( true )
        } )

        it( 'fails when type is null', () => {
            const skill = buildValidSkill( { type: null } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL102' ) ) ).toBe( true )
        } )

        it( 'fails when type is not a string', () => {
            const skill = buildValidSkill( { type: 42 } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL102' ) ) ).toBe( true )
        } )

        it( 'fails when type is not in the allowed enum', () => {
            const skill = buildValidSkill( { type: 'bogus-type' } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL102' ) ) ).toBe( true )
        } )

        it( 'passes for type namespace-skill', () => {
            const skill = buildValidSkill( { type: 'namespace-skill' } )
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )

        it( 'passes for type selection-skill', () => {
            const skill = buildValidSkill( { type: 'selection-skill' } )
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )

        it( 'passes for type agent-skill', () => {
            const skill = buildValidSkill( { type: 'agent-skill' } )
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'name validation (v2 baseline)', () => {
        it( 'fails when name is missing', () => {
            const skill = buildValidSkill( { name: undefined } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.name: Missing required field' ) ) ).toBe( true )
        } )

        it( 'fails when name does not match pattern', () => {
            const skill = buildValidSkill( { name: 'BadName' } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.name: Must match pattern' ) ) ).toBe( true )
        } )
    } )


    describe( 'description / content / output validation (v2 baseline)', () => {
        it( 'fails when description is missing', () => {
            const skill = buildValidSkill( { description: undefined } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.description: Missing required field' ) ) ).toBe( true )
        } )

        it( 'fails when description is longer than 1024 chars', () => {
            const longDescription = 'a'.repeat( 1025 )
            const skill = buildValidSkill( { description: longDescription } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.description: Must be at most 1024 characters' ) ) ).toBe( true )
        } )

        it( 'fails when content is missing', () => {
            const skill = buildValidSkill( { content: undefined } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.content: Missing required field' ) ) ).toBe( true )
        } )

        it( 'fails when content is empty', () => {
            const skill = buildValidSkill( { content: '   ' } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.content: Must not be empty' ) ) ).toBe( true )
        } )

        it( 'fails when output is missing', () => {
            const skill = buildValidSkill( { output: undefined } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.output: Missing required field' ) ) ).toBe( true )
        } )
    } )


    describe( 'requires validation (v2 baseline)', () => {
        it( 'passes when requires is undefined', () => {
            const skill = buildValidSkill()
            delete skill[ 'requires' ]
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )

        it( 'fails when requires is not a plain object', () => {
            const skill = buildValidSkill( { requires: [ 'a', 'b' ] } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.requires: Must be a plain object' ) ) ).toBe( true )
        } )

        it( 'fails when requires.tools references unknown tool', () => {
            const skill = buildValidSkill( { requires: { tools: [ 'missing-tool' ] } } )
            const { status, messages } = runValidate( { skill, tools: [ 'known-tool' ] } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Tool "missing-tool" does not exist' ) ) ).toBe( true )
        } )

        it( 'passes when requires.tools references known tool', () => {
            const skill = buildValidSkill( { requires: { tools: [ 'known-tool' ] } } )
            const { status } = runValidate( { skill, tools: [ 'known-tool' ] } )

            expect( status ).toBe( true )
        } )

        it( 'fails when requires.resources references unknown resource', () => {
            const skill = buildValidSkill( { requires: { resources: [ 'missing-res' ] } } )
            const { status, messages } = runValidate( { skill, resources: [ 'known-res' ] } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Resource "missing-res" does not exist' ) ) ).toBe( true )
        } )

        it( 'fails when requires.external entry is not a string', () => {
            const skill = buildValidSkill( { requires: { external: [ 'ok', 123 ] } } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.requires.external[1]: Must be type "string"' ) ) ).toBe( true )
        } )

        it( 'fails when requires.tools is not an array', () => {
            const skill = buildValidSkill( { requires: { tools: 'not-array' } } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.requires.tools: Must be an array' ) ) ).toBe( true )
        } )
    } )


    describe( 'input validation (v2 baseline)', () => {
        it( 'passes when input is undefined', () => {
            const skill = buildValidSkill()
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )

        it( 'fails when input is not an array', () => {
            const skill = buildValidSkill( { input: { not: 'array' } } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.input: Must be an array' ) ) ).toBe( true )
        } )

        it( 'fails when input param has wrong type enum', () => {
            const skill = buildValidSkill( {
                input: [
                    { key: 'k1', type: 'unknown', description: 'd', required: true }
                ]
            } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.input[0].type: Must be one of' ) ) ).toBe( true )
        } )

        it( 'passes a valid input definition', () => {
            const skill = buildValidSkill( {
                input: [
                    { key: 'contractAddress', type: 'string', description: 'address', required: true }
                ]
            } )
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )

        it( 'fails when enum type is missing values', () => {
            const skill = buildValidSkill( {
                input: [
                    { key: 'mode', type: 'enum', description: 'mode', required: true }
                ]
            } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.input[0].values: Required when type is "enum"' ) ) ).toBe( true )
        } )

        it( 'fails when enum values are empty', () => {
            const skill = buildValidSkill( {
                input: [
                    { key: 'mode', type: 'enum', description: 'mode', required: true, values: [] }
                ]
            } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '.input[0].values: Must not be empty' ) ) ).toBe( true )
        } )
    } )


    describe( 'placeholders validation (v2 baseline)', () => {
        it( 'passes when placeholders is undefined', () => {
            const skill = buildValidSkill()
            const { status } = runValidate( { skill } )

            expect( status ).toBe( true )
        } )

        it( 'fails when placeholder references unknown tool', () => {
            const skill = buildValidSkill( {
                placeholders: [ { type: 'tool', name: 'missing-tool' } ]
            } )
            const { status, messages } = runValidate( { skill, tools: [] } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '{{tool:missing-tool}} references non-existent tool' ) ) ).toBe( true )
        } )

        it( 'fails when placeholder references unknown resource', () => {
            const skill = buildValidSkill( {
                placeholders: [ { type: 'resource', name: 'missing-res' } ]
            } )
            const { status, messages } = runValidate( { skill, resources: [] } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '{{resource:missing-res}} references non-existent resource' ) ) ).toBe( true )
        } )

        it( 'fails when placeholder references unknown skill', () => {
            const skill = buildValidSkill( {
                placeholders: [ { type: 'skill', name: 'missing-skill' } ]
            } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '{{skill:missing-skill}} references non-existent skill' ) ) ).toBe( true )
        } )

        it( 'fails when placeholder references undefined input', () => {
            const skill = buildValidSkill( {
                placeholders: [ { type: 'input', name: 'missing-input' } ]
            } )
            const { status, messages } = runValidate( { skill } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( '{{input:missing-input}} references undefined input parameter' ) ) ).toBe( true )
        } )

        it( 'passes when placeholder references known tool/resource/skill/input', () => {
            const skill = buildValidSkill( {
                input: [
                    { key: 'address', type: 'string', description: 'addr', required: true }
                ],
                placeholders: [
                    { type: 'tool', name: 'known-tool' },
                    { type: 'resource', name: 'known-res' },
                    { type: 'skill', name: 'test-skill' },
                    { type: 'input', name: 'address' }
                ]
            } )
            const { status } = runValidate( { skill, tools: [ 'known-tool' ], resources: [ 'known-res' ] } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'multi-skill validation', () => {
        it( 'aggregates messages across multiple skills', () => {
            const goodSkill = buildValidSkill( { name: 'good-skill' } )
            const badSkill = buildValidSkill( { name: 'bad-skill', version: 'flowmcp-skill/1.0.0', whenToUse: undefined } )
            const skills = { good: goodSkill, bad: badSkill }
            const { status, messages } = SkillValidator.validate( { skills, tools: [], resources: [] } )

            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'SKL103' ) && m.includes( 'skill "bad"' ) ) ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'SKL101' ) && m.includes( 'skill "bad"' ) ) ).toBe( true )
        } )
    } )
} )
