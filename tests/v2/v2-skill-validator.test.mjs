import { describe, test, expect } from '@jest/globals'
import { SkillValidator } from '../../src/v2/task/SkillValidator.mjs'


const validSkill = {
    name: 'test-skill',
    version: 'flowmcp-skill/1.0.0',
    description: 'A valid test skill.',
    content: '## Instructions\n\nUse {{tool:getStatus}} to check the API.',
    output: 'Markdown report.',
    requires: {
        tools: [ 'getStatus' ],
        resources: [],
        external: []
    },
    input: [
        {
            key: 'address',
            type: 'string',
            description: 'Contract address',
            required: true
        }
    ],
    placeholders: [
        { type: 'tool', name: 'getStatus' }
    ]
}

const toolsList = [ 'getStatus', 'getContractAbi' ]
const resourcesList = [ 'verifiedContracts' ]


describe( 'SkillValidator', () => {
    describe( 'validate()', () => {
        test( 'passes a valid skill', () => {
            const skills = { 'test-skill': validSkill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails when name is missing', () => {
            const skill = { ...validSkill, name: undefined }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasNameError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.name' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasNameError ).toBe( true )
        } )


        test( 'fails when name has invalid format', () => {
            const skill = { ...validSkill, name: 'Invalid-Name-123' }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasNameError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.name' ) && msg.includes( 'Must match pattern' )

                    return match
                } )

            expect( hasNameError ).toBe( true )
        } )


        test( 'fails when name starts with a number', () => {
            const skill = { ...validSkill, name: '3d-chart' }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasNameError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.name' ) && msg.includes( 'Must match pattern' )

                    return match
                } )

            expect( hasNameError ).toBe( true )
        } )


        test( 'fails when version is wrong', () => {
            const skill = { ...validSkill, version: '1.0.0' }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasVersionError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.version' ) && msg.includes( 'flowmcp-skill/1.0.0' )

                    return match
                } )

            expect( hasVersionError ).toBe( true )
        } )


        test( 'fails when version is missing', () => {
            const skill = { ...validSkill, version: undefined }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasVersionError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.version' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasVersionError ).toBe( true )
        } )


        test( 'fails when description exceeds 1024 characters', () => {
            const longDescription = 'a'.repeat( 1025 )
            const skill = { ...validSkill, description: longDescription }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.description' ) && msg.includes( '1024' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'fails when description is missing', () => {
            const skill = { ...validSkill, description: undefined }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.description' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'fails when content is empty', () => {
            const skill = { ...validSkill, content: '   ', placeholders: [] }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasContentError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.content' ) && msg.includes( 'Must not be empty' )

                    return match
                } )

            expect( hasContentError ).toBe( true )
        } )


        test( 'fails when content is missing', () => {
            const skill = { ...validSkill, content: undefined, placeholders: [] }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasContentError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.content' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasContentError ).toBe( true )
        } )


        test( 'fails when output is missing', () => {
            const skill = { ...validSkill, output: undefined }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasOutputError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.output' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasOutputError ).toBe( true )
        } )


        test( 'fails when output is empty', () => {
            const skill = { ...validSkill, output: '' }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasOutputError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.output' ) && msg.includes( 'Must not be empty' )

                    return match
                } )

            expect( hasOutputError ).toBe( true )
        } )


        test( 'fails when requires.tools references non-existent tool', () => {
            const skill = {
                ...validSkill,
                requires: {
                    tools: [ 'nonExistentTool' ],
                    resources: [],
                    external: []
                },
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasToolError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'requires.tools' ) && msg.includes( 'nonExistentTool' )

                    return match
                } )

            expect( hasToolError ).toBe( true )
        } )


        test( 'fails when requires.resources references non-existent resource', () => {
            const skill = {
                ...validSkill,
                requires: {
                    tools: [ 'getStatus' ],
                    resources: [ 'nonExistentResource' ],
                    external: []
                },
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasResourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'requires.resources' ) && msg.includes( 'nonExistentResource' )

                    return match
                } )

            expect( hasResourceError ).toBe( true )
        } )


        test( 'fails when requires.external contains non-string', () => {
            const skill = {
                ...validSkill,
                requires: {
                    tools: [ 'getStatus' ],
                    resources: [],
                    external: [ 123 ]
                },
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasExternalError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'requires.external' ) && msg.includes( 'Must be type "string"' )

                    return match
                } )

            expect( hasExternalError ).toBe( true )
        } )


        test( 'fails when placeholder {{tool:x}} references non-existent tool', () => {
            const skill = {
                ...validSkill,
                content: 'Use {{tool:nonExistentTool}} to do something.',
                requires: {
                    tools: [],
                    resources: [],
                    external: []
                },
                placeholders: [
                    { type: 'tool', name: 'nonExistentTool' }
                ]
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasPlaceholderError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '{{tool:nonExistentTool}}' ) && msg.includes( 'non-existent tool' )

                    return match
                } )

            expect( hasPlaceholderError ).toBe( true )
        } )


        test( 'fails when placeholder {{resource:x}} references non-existent resource', () => {
            const skill = {
                ...validSkill,
                content: 'Check {{resource:missingResource}} for data.',
                requires: {
                    tools: [ 'getStatus' ],
                    resources: [],
                    external: []
                },
                placeholders: [
                    { type: 'resource', name: 'missingResource' }
                ]
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasPlaceholderError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '{{resource:missingResource}}' ) && msg.includes( 'non-existent resource' )

                    return match
                } )

            expect( hasPlaceholderError ).toBe( true )
        } )


        test( 'fails when placeholder {{skill:x}} references non-existent skill', () => {
            const skill = {
                ...validSkill,
                content: 'Follow {{skill:unknown-skill}} for details.',
                requires: {
                    tools: [ 'getStatus' ],
                    resources: [],
                    external: []
                },
                placeholders: [
                    { type: 'skill', name: 'unknown-skill' }
                ]
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasPlaceholderError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '{{skill:unknown-skill}}' ) && msg.includes( 'non-existent skill' )

                    return match
                } )

            expect( hasPlaceholderError ).toBe( true )
        } )


        test( 'fails when placeholder {{input:x}} references undefined input', () => {
            const skill = {
                ...validSkill,
                content: 'Use {{input:unknownParam}} for the query.',
                input: [
                    {
                        key: 'address',
                        type: 'string',
                        description: 'Contract address',
                        required: true
                    }
                ],
                placeholders: [
                    { type: 'input', name: 'unknownParam' }
                ]
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasPlaceholderError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '{{input:unknownParam}}' ) && msg.includes( 'undefined input parameter' )

                    return match
                } )

            expect( hasPlaceholderError ).toBe( true )
        } )


        test( 'fails when input type is enum without values', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        key: 'network',
                        type: 'enum',
                        description: 'Target network',
                        required: true
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasValuesError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.values' ) && msg.includes( 'Required when type is "enum"' )

                    return match
                } )

            expect( hasValuesError ).toBe( true )
        } )


        test( 'fails when input type is enum with empty values array', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        key: 'network',
                        type: 'enum',
                        description: 'Target network',
                        required: true,
                        values: []
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasValuesError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.values' ) && msg.includes( 'Must not be empty' )

                    return match
                } )

            expect( hasValuesError ).toBe( true )
        } )


        test( 'fails when input type is invalid', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        key: 'data',
                        type: 'object',
                        description: 'Some data',
                        required: true
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasTypeError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.type' ) && msg.includes( 'Must be one of' )

                    return match
                } )

            expect( hasTypeError ).toBe( true )
        } )


        test( 'fails when input key is missing', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        type: 'string',
                        description: 'Some parameter',
                        required: true
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasKeyError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.key' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasKeyError ).toBe( true )
        } )


        test( 'fails when input description is missing', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        key: 'address',
                        type: 'string',
                        required: true
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.description' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'fails when input required is missing', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        key: 'address',
                        type: 'string',
                        description: 'Contract address'
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasRequiredError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.required' ) && msg.includes( 'Missing required field' )

                    return match
                } )

            expect( hasRequiredError ).toBe( true )
        } )


        test( 'fails when input required is not a boolean', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        key: 'address',
                        type: 'string',
                        description: 'Contract address',
                        required: 'yes'
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasRequiredError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.required' ) && msg.includes( 'Must be type "boolean"' )

                    return match
                } )

            expect( hasRequiredError ).toBe( true )
        } )


        test( 'collects multiple errors in messages array', () => {
            const skill = {
                name: undefined,
                version: 'wrong',
                description: undefined,
                content: '',
                output: undefined,
                requires: {
                    tools: [ 'nonExistent' ],
                    resources: [],
                    external: []
                },
                input: [],
                placeholders: []
            }
            const skills = { 'broken-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )
            expect( messages.length ).toBeGreaterThanOrEqual( 4 )

            const hasNameError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.name' )

                    return match
                } )

            const hasVersionError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.version' )

                    return match
                } )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.description' )

                    return match
                } )

            const hasOutputError = messages
                .some( ( msg ) => {
                    const match = msg.includes( '.output' )

                    return match
                } )

            expect( hasNameError ).toBe( true )
            expect( hasVersionError ).toBe( true )
            expect( hasDescError ).toBe( true )
            expect( hasOutputError ).toBe( true )
        } )


        test( 'passes valid skill with enum input that has values', () => {
            const skill = {
                ...validSkill,
                input: [
                    {
                        key: 'network',
                        type: 'enum',
                        description: 'Target network',
                        required: true,
                        values: [ 'ethereum', 'polygon' ]
                    }
                ],
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes skill without requires section', () => {
            const { requires, ...skillWithoutRequires } = validSkill
            const skill = {
                ...skillWithoutRequires,
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes skill without input section', () => {
            const { input, ...skillWithoutInput } = validSkill
            const skill = {
                ...skillWithoutInput,
                placeholders: []
            }
            const skills = { 'test-skill': skill }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'validates multiple skills in one call', () => {
            const validSkill2 = {
                ...validSkill,
                name: 'second-skill',
                placeholders: []
            }

            const invalidSkill = {
                name: undefined,
                version: 'flowmcp-skill/1.0.0',
                description: 'Invalid.',
                content: 'Some content.',
                output: 'Some output.',
                placeholders: []
            }

            const skills = {
                'test-skill': { ...validSkill, placeholders: [] },
                'second-skill': validSkill2,
                'invalid-skill': invalidSkill
            }

            const { status, messages } = SkillValidator
                .validate( { skills, tools: toolsList, resources: resourcesList } )

            expect( status ).toBe( false )

            const hasInvalidSkillError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'invalid-skill' )

                    return match
                } )

            expect( hasInvalidSkillError ).toBe( true )
        } )
    } )
} )
