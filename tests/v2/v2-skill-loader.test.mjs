import { describe, test, expect } from '@jest/globals'
import { SkillLoader } from '../../src/v2/task/SkillLoader.mjs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturesDir = join( __dirname, 'fixtures' )


describe( 'SkillLoader', () => {
    describe( 'load()', () => {
        test( 'loads a valid skill file', async () => {
            const skillDefinitions = {
                'valid-skill': { file: './skills/valid-skill.mjs' }
            }

            const { status, skills, messages } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
            expect( skills[ 'valid-skill' ] ).toBeDefined()
            expect( skills[ 'valid-skill' ][ 'name' ] ).toBe( 'valid-skill' )
            expect( skills[ 'valid-skill' ][ 'version' ] ).toBe( 'flowmcp-skill/1.0.0' )
            expect( skills[ 'valid-skill' ][ 'description' ] ).toBe( 'A valid test skill for contract analysis.' )
            expect( skills[ 'valid-skill' ][ 'output' ] ).toBe( 'Markdown report with ABI analysis.' )
            expect( typeof skills[ 'valid-skill' ][ 'content' ] ).toBe( 'string' )
        } )


        test( 'returns error when file does not exist', async () => {
            const skillDefinitions = {
                'nonexistent': { file: './skills/does-not-exist.mjs' }
            }

            const { status, skills, messages } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( false )
            expect( messages.length ).toBe( 1 )

            const hasFileError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'nonexistent' )

                    return match
                } )

            expect( hasFileError ).toBe( true )
            expect( skills[ 'nonexistent' ] ).toBeUndefined()
        } )


        test( 'returns error when skill export is missing', async () => {
            const skillDefinitions = {
                'missing-export': { file: './skills/missing-skill-export.mjs' }
            }

            const { status, skills, messages } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( false )
            expect( messages.length ).toBe( 1 )

            const hasMissingExport = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'missing-export' ) && msg.includes( 'Missing "skill" export' )

                    return match
                } )

            expect( hasMissingExport ).toBe( true )
            expect( skills[ 'missing-export' ] ).toBeUndefined()
        } )


        test( 'extracts placeholders correctly from content', async () => {
            const skillDefinitions = {
                'all-placeholders': { file: './skills/valid-skill-with-all-placeholders.mjs' }
            }

            const { status, skills, messages } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )

            const { placeholders } = skills[ 'all-placeholders' ]

            expect( Array.isArray( placeholders ) ).toBe( true )
            expect( placeholders.length ).toBe( 4 )

            const toolPlaceholders = placeholders
                .filter( ( p ) => {
                    const match = p.type === 'tool'

                    return match
                } )

            expect( toolPlaceholders.length ).toBe( 1 )
            expect( toolPlaceholders[ 0 ][ 'name' ] ).toBe( 'getContractAbi' )

            const resourcePlaceholders = placeholders
                .filter( ( p ) => {
                    const match = p.type === 'resource'

                    return match
                } )

            expect( resourcePlaceholders.length ).toBe( 1 )
            expect( resourcePlaceholders[ 0 ][ 'name' ] ).toBe( 'verifiedContracts' )

            const skillPlaceholders = placeholders
                .filter( ( p ) => {
                    const match = p.type === 'skill'

                    return match
                } )

            expect( skillPlaceholders.length ).toBe( 1 )
            expect( skillPlaceholders[ 0 ][ 'name' ] ).toBe( 'quick-check' )

            const inputPlaceholders = placeholders
                .filter( ( p ) => {
                    const match = p.type === 'input'

                    return match
                } )

            expect( inputPlaceholders.length ).toBe( 1 )
            expect( inputPlaceholders[ 0 ][ 'name' ] ).toBe( 'address' )
        } )


        test( 'returns empty placeholders for skill without placeholders', async () => {
            const skillDefinitions = {
                'no-placeholders': { file: './skills/no-placeholders-skill.mjs' }
            }

            const { status, skills, messages } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )

            const { placeholders } = skills[ 'no-placeholders' ]

            expect( Array.isArray( placeholders ) ).toBe( true )
            expect( placeholders.length ).toBe( 0 )
        } )


        test( 'resolves relative paths from schemaDir', async () => {
            const skillDefinitions = {
                'valid-skill': { file: './skills/valid-skill.mjs' }
            }

            const { status, skills } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( true )
            expect( skills[ 'valid-skill' ] ).toBeDefined()
            expect( skills[ 'valid-skill' ][ 'name' ] ).toBe( 'valid-skill' )
        } )


        test( 'loads multiple skills in one call', async () => {
            const skillDefinitions = {
                'valid-skill': { file: './skills/valid-skill.mjs' },
                'no-placeholders': { file: './skills/no-placeholders-skill.mjs' }
            }

            const { status, skills, messages } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
            expect( Object.keys( skills ).length ).toBe( 2 )
            expect( skills[ 'valid-skill' ] ).toBeDefined()
            expect( skills[ 'no-placeholders' ] ).toBeDefined()
        } )


        test( 'reports error for failing skill while loading others', async () => {
            const skillDefinitions = {
                'valid-skill': { file: './skills/valid-skill.mjs' },
                'broken': { file: './skills/does-not-exist.mjs' }
            }

            const { status, skills, messages } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( false )
            expect( messages.length ).toBe( 1 )
            expect( skills[ 'valid-skill' ] ).toBeDefined()
            expect( skills[ 'broken' ] ).toBeUndefined()
        } )


        test( 'preserves all skill fields in output', async () => {
            const skillDefinitions = {
                'enum-skill': { file: './skills/valid-enum-skill.mjs' }
            }

            const { status, skills } = await SkillLoader
                .load( { skillDefinitions, schemaDir: fixturesDir } )

            expect( status ).toBe( true )

            const skill = skills[ 'enum-skill' ]

            expect( skill[ 'name' ] ).toBe( 'enum-skill' )
            expect( skill[ 'version' ] ).toBe( 'flowmcp-skill/1.0.0' )
            expect( skill[ 'requires' ][ 'tools' ] ).toEqual( [ 'getContractAbi' ] )
            expect( skill[ 'input' ].length ).toBe( 2 )
            expect( skill[ 'input' ][ 1 ][ 'type' ] ).toBe( 'enum' )
            expect( skill[ 'input' ][ 1 ][ 'values' ] ).toEqual( [ 'ethereum', 'polygon', 'arbitrum' ] )
        } )
    } )
} )
