import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pipeline } from '../../src/v2/task/Pipeline.mjs'


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures' )
const schemasDir = join( fixturesDir, 'schemas' )


describe( 'Pipeline — Provider Prompts', () => {
    test( 'loads schema with provider prompts and content files', async () => {
        const filePath = join( schemasDir, 'v3-with-prompts.mjs' )
        const result = await Pipeline.load( { filePath } )

        expect( result['status'] ).toBe( true )
        expect( result['messages'] ).toHaveLength( 0 )
        expect( result['prompts'] ).toBeDefined()

        const { prompts } = result

        expect( prompts['about'] ).toBeDefined()
        expect( prompts['about']['content'] ).toContain( 'TestProvider' )
        expect( prompts['about']['name'] ).toBe( 'about' )
        expect( prompts['about']['version'] ).toBe( 'flowmcp-prompt/1.0.0' )
        expect( prompts['about']['namespace'] ).toBe( 'testprovider' )
        expect( prompts['about']['placeholders'] ).toBeDefined()
        expect( prompts['about']['placeholders']['references'] ).toContain( 'testprovider/tool/getContractAbi' )
        expect( prompts['about']['placeholders']['parameters'] ).toContain( 'address' )

        expect( prompts['analysisGuide'] ).toBeDefined()
        expect( prompts['analysisGuide']['content'] ).toContain( 'Analysis Guide' )
        expect( prompts['analysisGuide']['name'] ).toBe( 'analysis-guide' )
        expect( prompts['analysisGuide']['references'] ).toEqual( [ 'testprovider/prompt/about' ] )
    } )


    test( 'includes about warning in warnings when about is missing', async () => {
        const filePath = join( schemasDir, 'v3-with-prompts-no-about.mjs' )
        const result = await Pipeline.load( { filePath } )

        expect( result['status'] ).toBe( true )
        expect( result['warnings']
            .find( ( w ) => {
                const found = w.includes( 'about' )

                return found
            } )
        ).toBeTruthy()
    } )
} )
