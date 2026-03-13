import { PromptValidator } from '../../src/v2/task/PromptValidator.mjs'


const validPrompt = {
    name: 'about',
    version: 'flowmcp-prompt/1.0.0',
    namespace: 'testprovider',
    description: 'Overview of TestProvider',
    dependsOn: [ 'getContractAbi' ],
    references: [],
    contentFile: './prompts/about.mjs'
}


describe( 'PromptValidator', () => {
    describe( 'validate()', () => {
        test( 'accepts valid provider prompts', () => {
            const prompts = { about: { ...validPrompt } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )


        test( 'rejects non-object prompts', () => {
            const { status, messages } = PromptValidator.validate( { prompts: 'invalid', namespace: 'test' } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'PRM001' )
        } )


        test( 'rejects null prompts', () => {
            const { status, messages } = PromptValidator.validate( { prompts: null, namespace: 'test' } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'PRM001' )
        } )


        test( 'rejects array prompts', () => {
            const { status, messages } = PromptValidator.validate( { prompts: [], namespace: 'test' } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'PRM001' )
        } )


        test( 'rejects empty prompts object', () => {
            const { status, messages } = PromptValidator.validate( { prompts: {}, namespace: 'test' } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'Must contain at least one prompt' )
        } )


        test( 'rejects more than 5 prompts', () => {
            const prompts = {}
            const keys = [ 'promptA', 'promptB', 'promptC', 'promptD', 'promptE', 'promptF' ]

            keys
                .forEach( ( key ) => {
                    prompts[ key ] = { ...validPrompt, name: key }
                } )

            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'PRM002' )
        } )


        test( 'rejects non-camelCase keys', () => {
            const prompts = { 'bad-key': { ...validPrompt } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'PRM003' )
        } )


        test( 'warns when about prompt is missing', () => {
            const prompts = { analysisGuide: { ...validPrompt, name: 'analysis-guide' } }
            const { status, warnings } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
            expect( warnings ).toHaveLength( 1 )
            expect( warnings[ 0 ] ).toContain( 'PRM-WARN' )
            expect( warnings[ 0 ] ).toContain( 'about' )
        } )


        test( 'does not warn when about prompt exists', () => {
            const prompts = { about: { ...validPrompt } }
            const { warnings } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( warnings ).toHaveLength( 0 )
        } )
    } )


    describe( 'name validation (PRM001)', () => {
        test( 'rejects missing name', () => {
            const { name, ...rest } = validPrompt
            const prompts = { about: rest }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM001' ) && m.includes( 'name' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects non-string name', () => {
            const prompts = { about: { ...validPrompt, name: 123 } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM001' ) && m.includes( 'string' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects name with uppercase', () => {
            const prompts = { about: { ...validPrompt, name: 'About' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM001' ) && m.includes( 'Must match' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects name starting with number', () => {
            const prompts = { about: { ...validPrompt, name: '3d-analysis' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM001' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'accepts valid kebab-case name', () => {
            const prompts = { guide: { ...validPrompt, name: 'analysis-guide' } }
            const { status } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'version validation (PRM002)', () => {
        test( 'rejects missing version', () => {
            const { version, ...rest } = validPrompt
            const prompts = { about: rest }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM002' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects wrong version', () => {
            const prompts = { about: { ...validPrompt, version: '1.0.0' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM002' ) && m.includes( 'flowmcp-prompt/1.0.0' )

                    return found
                } )
            ).toBeTruthy()
        } )
    } )


    describe( 'namespace validation (PRM003)', () => {
        test( 'rejects missing namespace', () => {
            const { namespace, ...rest } = validPrompt
            const prompts = { about: rest }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM003' ) && m.includes( 'namespace' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects namespace mismatch with schema namespace', () => {
            const prompts = { about: { ...validPrompt, namespace: 'otherprovider' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM003' ) && m.includes( 'Must match schema namespace' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'accepts matching namespace', () => {
            const prompts = { about: { ...validPrompt } }
            const { status } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'description validation (PRM004)', () => {
        test( 'rejects missing description', () => {
            const { description, ...rest } = validPrompt
            const prompts = { about: rest }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM004' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects empty description', () => {
            const prompts = { about: { ...validPrompt, description: '' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM004' ) && m.includes( 'empty' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects description over 1024 characters', () => {
            const longDesc = 'a'.repeat( 1025 )
            const prompts = { about: { ...validPrompt, description: longDesc } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM004' ) && m.includes( '1024' )

                    return found
                } )
            ).toBeTruthy()
        } )
    } )


    describe( 'dependsOn validation (PRM005)', () => {
        test( 'rejects missing dependsOn', () => {
            const { dependsOn, ...rest } = validPrompt
            const prompts = { about: rest }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM005' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects non-array dependsOn', () => {
            const prompts = { about: { ...validPrompt, dependsOn: 'getContractAbi' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM005' ) && m.includes( 'array' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects non-string entries in dependsOn', () => {
            const prompts = { about: { ...validPrompt, dependsOn: [ 123 ] } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM005' ) && m.includes( 'string' )

                    return found
                } )
            ).toBeTruthy()
        } )
    } )


    describe( 'references validation (PRM013)', () => {
        test( 'rejects missing references', () => {
            const { references, ...rest } = validPrompt
            const prompts = { about: rest }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM013' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects non-array references', () => {
            const prompts = { about: { ...validPrompt, references: 'ref' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM013' ) && m.includes( 'array' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'accepts empty references array', () => {
            const prompts = { about: { ...validPrompt, references: [] } }
            const { status } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
        } )


        test( 'accepts references with valid entries', () => {
            const prompts = {
                about: {
                    ...validPrompt,
                    references: [ 'testprovider/prompt/other' ]
                }
            }
            const { status } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'contentFile validation (PRM011)', () => {
        test( 'rejects missing contentFile', () => {
            const { contentFile, ...rest } = validPrompt
            const prompts = { about: rest }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM011' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects non-mjs contentFile', () => {
            const prompts = { about: { ...validPrompt, contentFile: './prompts/about.js' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM011' ) && m.includes( '.mjs' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'accepts valid contentFile path', () => {
            const prompts = { about: { ...validPrompt, contentFile: './prompts/about.mjs' } }
            const { status } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
        } )
    } )


    describe( 'forbidden fields', () => {
        test( 'rejects agent field on provider-prompt', () => {
            const prompts = { about: { ...validPrompt, agent: 'some-agent' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM003' ) && m.includes( 'agent' ) && m.includes( 'Forbidden' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects testedWith field on provider-prompt', () => {
            const prompts = { about: { ...validPrompt, testedWith: 'anthropic/claude' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM004' ) && m.includes( 'testedWith' ) && m.includes( 'Forbidden' )

                    return found
                } )
            ).toBeTruthy()
        } )


        test( 'rejects content field on provider-prompt', () => {
            const prompts = { about: { ...validPrompt, content: 'inline content' } }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages
                .find( ( m ) => {
                    const found = m.includes( 'PRM010' ) && m.includes( 'content' ) && m.includes( 'Forbidden' )

                    return found
                } )
            ).toBeTruthy()
        } )
    } )


    describe( 'multiple prompts', () => {
        test( 'validates multiple valid prompts', () => {
            const prompts = {
                about: { ...validPrompt },
                analysisGuide: {
                    ...validPrompt,
                    name: 'analysis-guide',
                    description: 'How to analyze contracts',
                    dependsOn: [ 'getContractAbi', 'getContractSource' ],
                    references: [ 'testprovider/prompt/about' ],
                    contentFile: './prompts/analysis-guide.mjs'
                }
            }
            const { status } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( true )
        } )


        test( 'collects errors from multiple prompts', () => {
            const prompts = {
                about: { ...validPrompt, name: 'INVALID' },
                guide: { ...validPrompt, version: 'wrong' }
            }
            const { status, messages } = PromptValidator.validate( { prompts, namespace: 'testprovider' } )

            expect( status ).toBe( false )
            expect( messages.length ).toBeGreaterThanOrEqual( 2 )
        } )
    } )
} )
