import { describe, it, expect } from '@jest/globals'
import { GradeReporter } from '../../../src/v4/task/GradeReporter.mjs'

describe( 'GradeReporter', () => {
    describe( 'buildEvalPrompts()', () => {
        it( 'returns an evalPrompts array with dimension + prompt fields', () => {
            const schema = { description: 'Etherscan contract tools', tools: {} }
            const { evalPrompts } = GradeReporter.buildEvalPrompts( { schema } )
            expect( Array.isArray( evalPrompts ) ).toBe( true )
            expect( evalPrompts.length ).toBeGreaterThan( 0 )
            evalPrompts
                .forEach( ( ep ) => {
                    expect( typeof ep.dimension ).toBe( 'string' )
                    expect( typeof ep.prompt ).toBe( 'string' )
                } )
        } )

        it( 'includes both whenToUse and parameters dimensions', () => {
            const schema = { description: 'X', tools: {} }
            const { evalPrompts } = GradeReporter.buildEvalPrompts( { schema } )
            const dimensions = evalPrompts.map( ( ep ) => ep.dimension )
            expect( dimensions ).toContain( 'whenToUse' )
            expect( dimensions ).toContain( 'parameters' )
        } )

        it( 'embeds skill.whenToUse into the whenToUse prompt when provided', () => {
            const schema = { description: 'X', tools: {} }
            const skill = { whenToUse: 'Use when analyzing contracts' }
            const { evalPrompts } = GradeReporter.buildEvalPrompts( { schema, skill } )
            const whenPrompt = evalPrompts.find( ( ep ) => ep.dimension === 'whenToUse' )
            expect( whenPrompt.prompt ).toContain( 'Use when analyzing contracts' )
        } )

        it( 'falls back to a placeholder when skill is missing', () => {
            const schema = { description: 'X', tools: {} }
            const { evalPrompts } = GradeReporter.buildEvalPrompts( { schema } )
            const whenPrompt = evalPrompts.find( ( ep ) => ep.dimension === 'whenToUse' )
            expect( whenPrompt.prompt ).toContain( 'No skill whenToUse provided.' )
        } )

        it( 'throws when schema is null', () => {
            expect( () => GradeReporter.buildEvalPrompts( { schema: null } ) )
                .toThrow( /schema must be an object/ )
        } )

        it( 'throws when schema is undefined', () => {
            expect( () => GradeReporter.buildEvalPrompts( { schema: undefined } ) )
                .toThrow( /schema must be an object/ )
        } )

        it( 'throws when schema is not an object', () => {
            expect( () => GradeReporter.buildEvalPrompts( { schema: 'not-an-object' } ) )
                .toThrow( /schema must be an object/ )
        } )
    } )

    describe( 'grade()', () => {
        const validScores = [
            { dimension: 'whenToUse', score: 4.5 },
            { dimension: 'parameters', score: 4.0 }
        ]

        it( 'returns grade A for PASS + averageScore >= 4.0', () => {
            const { grade } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( grade ).toBe( 'A' )
        } )

        it( 'returns grade F when deterministic FAIL', () => {
            const { grade } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'FAIL' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( grade ).toBe( 'F' )
        } )

        it( 'returns grade F when deterministic FAIL even with perfect scores', () => {
            const perfectScores = [
                { dimension: 'whenToUse', score: 5.0 },
                { dimension: 'parameters', score: 5.0 }
            ]
            const { grade } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'FAIL' },
                scores: perfectScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( grade ).toBe( 'F' )
        } )

        it( 'returns grade B for PASS + 3.0 <= score < 4.0', () => {
            const { grade } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: [ { dimension: 'whenToUse', score: 3.5 } ],
                validatorVersion: 'validation/4.0'
            } )
            expect( grade ).toBe( 'B' )
        } )

        it( 'returns grade C for PASS + 2.0 <= score < 3.0', () => {
            const { grade } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: [ { dimension: 'whenToUse', score: 2.5 } ],
                validatorVersion: 'validation/4.0'
            } )
            expect( grade ).toBe( 'C' )
        } )

        it( 'returns grade D for PASS + score < 2.0', () => {
            const { grade } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: [ { dimension: 'whenToUse', score: 1.0 } ],
                validatorVersion: 'validation/4.0'
            } )
            expect( grade ).toBe( 'D' )
        } )

        it( 'suggestedFileName uses underscores for slashes', () => {
            const { suggestedFileName } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( suggestedFileName ).toMatch( /^etherscan-io_contracts-\d{4}-\d{2}-\d{2}\.json$/ )
        } )

        it( 'suggestedFileName preserves hyphens in schema name', () => {
            const { suggestedFileName } = GradeReporter.grade( {
                schemaId: 'moralis/wallet-history',
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( suggestedFileName ).toMatch( /^moralis_wallet-history-\d{4}-\d{2}-\d{2}\.json$/ )
        } )

        it( 'report contains schemaId, grade, validatorVersion, timestamp', () => {
            const { report } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( report.schemaId ).toBe( 'etherscan-io/contracts' )
            expect( report.grade ).toBe( 'A' )
            expect( report.validatorVersion ).toBe( 'validation/4.0' )
            expect( typeof report.timestamp ).toBe( 'string' )
        } )

        it( 'report includes deterministic and probabilistic sub-objects', () => {
            const det = { status: 'PASS', checks: [ 'a', 'b' ] }
            const { report } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: det,
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( report.deterministic ).toEqual( det )
            expect( report.probabilistic.scores ).toEqual( validScores )
            expect( report.probabilistic.averageScore ).toBeCloseTo( 4.25, 5 )
            expect( report.averageScore ).toBeCloseTo( 4.25, 5 )
        } )

        it( 'throws when schemaId has 2 slashes (Primitive-ID rejected)', () => {
            expect( () => GradeReporter.grade( {
                schemaId: 'etherscan-io/tool/getAbi',
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /Schema-File-ID \(1 slash\)/ )
        } )

        it( 'throws when schemaId has 0 slashes', () => {
            expect( () => GradeReporter.grade( {
                schemaId: 'etherscan-io',
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /Schema-File-ID \(1 slash\)/ )
        } )

        it( 'throws when schemaId is empty string', () => {
            expect( () => GradeReporter.grade( {
                schemaId: '',
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /schemaId must be a non-empty string/ )
        } )

        it( 'throws when schemaId is not a string', () => {
            expect( () => GradeReporter.grade( {
                schemaId: 123,
                deterministicResult: { status: 'PASS' },
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /schemaId must be a non-empty string/ )
        } )

        it( 'throws when scores is not an array', () => {
            expect( () => GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: 'not-an-array',
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /scores must be an array/ )
        } )

        it( 'throws when score entry has wrong shape', () => {
            expect( () => GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: [ { dimension: 'x', score: 'not-a-number' } ],
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /score must be a number/ )
        } )

        it( 'throws when score entry is missing dimension', () => {
            expect( () => GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: [ { score: 4.0 } ],
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /dimension must be a string/ )
        } )

        it( 'throws when score entry is null', () => {
            expect( () => GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: { status: 'PASS' },
                scores: [ null ],
                validatorVersion: 'validation/4.0'
            } ) ).toThrow( /must be an object/ )
        } )

        it( 'returns grade F when deterministicResult is null', () => {
            const { grade } = GradeReporter.grade( {
                schemaId: 'etherscan-io/contracts',
                deterministicResult: null,
                scores: validScores,
                validatorVersion: 'validation/4.0'
            } )
            expect( grade ).toBe( 'F' )
        } )
    } )
} )
