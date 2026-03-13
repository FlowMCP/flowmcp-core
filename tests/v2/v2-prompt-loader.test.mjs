import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PromptLoader } from '../../src/v2/task/PromptLoader.mjs'


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures' )
const schemasDir = join( fixturesDir, 'schemas' )
const promptsDir = join( fixturesDir, 'prompts' )


describe( 'PromptLoader', () => {
    describe( 'loadProviderPrompts()', () => {
        test( 'loads valid content file and extracts placeholders', async () => {
            const prompts = {
                about: {
                    name: 'about',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Overview of TestProvider',
                    dependsOn: [ 'getContractAbi' ],
                    references: [],
                    contentFile: './about.mjs'
                }
            }

            const { status, messages, prompts: loaded } = await PromptLoader
                .loadProviderPrompts( { prompts, schemaDir: promptsDir } )

            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
            expect( loaded['about'] ).toBeDefined()
            expect( loaded['about']['content'] ).toContain( 'TestProvider' )
            expect( loaded['about']['placeholders'] ).toBeDefined()
            expect( loaded['about']['placeholders']['references'] ).toContain( 'testprovider/tool/getContractAbi' )
            expect( loaded['about']['placeholders']['parameters'] ).toContain( 'address' )
        } )


        test( 'loads multiple content files', async () => {
            const prompts = {
                about: {
                    name: 'about',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Overview',
                    dependsOn: [ 'getContractAbi' ],
                    references: [],
                    contentFile: './about.mjs'
                },
                analysisGuide: {
                    name: 'analysis-guide',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Analysis guide',
                    dependsOn: [ 'getContractAbi' ],
                    references: [],
                    contentFile: './analysis-guide.mjs'
                }
            }

            const { status, prompts: loaded } = await PromptLoader
                .loadProviderPrompts( { prompts, schemaDir: promptsDir } )

            expect( status ).toBe( true )
            expect( Object.keys( loaded ) ).toHaveLength( 2 )
            expect( loaded['about']['content'] ).toContain( 'TestProvider' )
            expect( loaded['analysisGuide']['content'] ).toContain( 'Analysis Guide' )
        } )


        test( 'fails when content file does not exist', async () => {
            const prompts = {
                about: {
                    name: 'about',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Overview',
                    dependsOn: [],
                    references: [],
                    contentFile: './nonexistent.mjs'
                }
            }

            const { status, messages } = await PromptLoader
                .loadProviderPrompts( { prompts, schemaDir: promptsDir } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'Content file not found' )
        } )


        test( 'fails when content file has wrong export', async () => {
            const prompts = {
                about: {
                    name: 'about',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Overview',
                    dependsOn: [],
                    references: [],
                    contentFile: './wrong-export.mjs'
                }
            }

            const { status, messages } = await PromptLoader
                .loadProviderPrompts( { prompts, schemaDir: promptsDir } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'must export "content"' )
        } )


        test( 'fails when content is empty', async () => {
            const prompts = {
                about: {
                    name: 'about',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Overview',
                    dependsOn: [],
                    references: [],
                    contentFile: './empty-content.mjs'
                }
            }

            const { status, messages } = await PromptLoader
                .loadProviderPrompts( { prompts, schemaDir: promptsDir } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'must not be empty' )
        } )


        test( 'fails when content file has forbidden import', async () => {
            const prompts = {
                about: {
                    name: 'about',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Overview',
                    dependsOn: [],
                    references: [],
                    contentFile: './has-import.mjs'
                }
            }

            const { status, messages } = await PromptLoader
                .loadProviderPrompts( { prompts, schemaDir: promptsDir } )

            expect( status ).toBe( false )
            expect( messages[ 0 ] ).toContain( 'Security violation' )
        } )


        test( 'preserves original definition fields in loaded prompt', async () => {
            const prompts = {
                about: {
                    name: 'about',
                    version: 'flowmcp-prompt/1.0.0',
                    namespace: 'testprovider',
                    description: 'Overview of TestProvider',
                    dependsOn: [ 'getContractAbi' ],
                    references: [ 'testprovider/prompt/other' ],
                    contentFile: './about.mjs'
                }
            }

            const { status, prompts: loaded } = await PromptLoader
                .loadProviderPrompts( { prompts, schemaDir: promptsDir } )

            expect( status ).toBe( true )

            const aboutPrompt = loaded['about']

            expect( aboutPrompt['name'] ).toBe( 'about' )
            expect( aboutPrompt['version'] ).toBe( 'flowmcp-prompt/1.0.0' )
            expect( aboutPrompt['namespace'] ).toBe( 'testprovider' )
            expect( aboutPrompt['dependsOn'] ).toEqual( [ 'getContractAbi' ] )
            expect( aboutPrompt['references'] ).toEqual( [ 'testprovider/prompt/other' ] )
            expect( aboutPrompt['contentFile'] ).toBe( './about.mjs' )
        } )
    } )


    describe( 'extractPlaceholders()', () => {
        test( 'extracts references and parameters from content', () => {
            const content = 'Use [[coingecko/tool/simplePrice]] for [[token]] analysis'
            const { references, parameters } = PromptLoader.extractPlaceholders( { content } )

            expect( references ).toEqual( [ 'coingecko/tool/simplePrice' ] )
            expect( parameters ).toEqual( [ 'token' ] )
        } )


        test( 'returns empty arrays for content without placeholders', () => {
            const content = 'Simple text without any placeholders'
            const { references, parameters } = PromptLoader.extractPlaceholders( { content } )

            expect( references ).toHaveLength( 0 )
            expect( parameters ).toHaveLength( 0 )
        } )


        test( 'extracts multiple references and parameters', () => {
            const content = `
                Use [[ns/tool/a]] and [[ns/tool/b]] for [[token]] on [[chain]].
                Also check [[ns/resource/db]].
            `
            const { references, parameters } = PromptLoader.extractPlaceholders( { content } )

            expect( references ).toHaveLength( 3 )
            expect( parameters ).toHaveLength( 2 )
            expect( references ).toContain( 'ns/tool/a' )
            expect( references ).toContain( 'ns/tool/b' )
            expect( references ).toContain( 'ns/resource/db' )
            expect( parameters ).toContain( 'token' )
            expect( parameters ).toContain( 'chain' )
        } )
    } )
} )
