const GRADE_THRESHOLDS = [
    [ 'A', 4.0 ],
    [ 'B', 3.0 ],
    [ 'C', 2.0 ]
]

const EVAL_DIMENSIONS = [ 'whenToUse', 'parameters' ]

export class GradeReporter {

    /**
     * Builds evaluation prompts for probabilistic validation.
     * Core defines the prompts — CLI calls the LLM with them.
     *
     * @param {Object} params
     * @param {Object} params.schema - The v4 schema object
     * @param {Object} [params.skill] - Optional skill object referencing the schema
     * @returns {{ evalPrompts: Array<{ dimension: string, prompt: string }> }}
     */
    static buildEvalPrompts( { schema, skill } ) {
        if( schema === null || schema === undefined || typeof schema !== 'object' ) {
            throw new Error( 'GradeReporter.buildEvalPrompts: schema must be an object' )
        }

        const evalPrompts = EVAL_DIMENSIONS
            .map( ( dimension ) => {
                const prompt = GradeReporter
                    ._buildPromptForDimension( { dimension, schema, skill } )
                return { dimension, prompt }
            } )

        return { evalPrompts }
    }


    /**
     * Computes grade and report from deterministic result + probabilistic scores.
     *
     * @param {Object} params
     * @param {string} params.schemaId - Schema-File-ID (1 slash, e.g. 'etherscan-io/contracts')
     * @param {Object} params.deterministicResult - Output of deterministic validator
     * @param {Array<{ dimension: string, score: number }>} params.scores - LLM scores
     * @param {string} params.validatorVersion - e.g. 'validation/4.0'
     * @returns {{ grade: string, report: Object, suggestedFileName: string }}
     */
    static grade( { schemaId, deterministicResult, scores, validatorVersion } ) {
        if( typeof schemaId !== 'string' || schemaId.length === 0 ) {
            throw new Error( 'GradeReporter.grade: schemaId must be a non-empty string' )
        }

        const slashMatches = schemaId.match( /\//g )
        const slashCount = slashMatches === null ? 0 : slashMatches.length
        if( slashCount !== 1 ) {
            throw new Error( `GradeReporter.grade: schemaId must be Schema-File-ID (1 slash), got '${schemaId}' with ${slashCount} slashes` )
        }

        GradeReporter._validateScoreInput( scores )

        const deterministicPass = deterministicResult !== undefined
            && deterministicResult !== null
            && deterministicResult.status === 'PASS'

        const scoreCount = scores.length === 0 ? 1 : scores.length
        const averageScore = scores
            .reduce( ( sum, entry ) => sum + entry.score, 0 ) / scoreCount

        const grade = deterministicPass
            ? GradeReporter._computeGradeFromScore( averageScore )
            : 'F'

        const timestamp = new Date().toISOString()
        const datePart = timestamp.slice( 0, 10 )
        const suggestedFileName = GradeReporter
            ._formatSuggestedFileName( schemaId, datePart )

        const report = {
            schemaId,
            validatorVersion,
            grade,
            averageScore,
            deterministic: deterministicResult,
            probabilistic: { scores, averageScore },
            timestamp
        }

        return { grade, report, suggestedFileName }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    static _buildPromptForDimension( { dimension, schema, skill } ) {
        if( dimension === 'whenToUse' ) {
            const skillBlock = skill !== undefined && skill !== null && typeof skill.whenToUse === 'string' && skill.whenToUse.length > 0
                ? `Skill whenToUse: "${skill.whenToUse}"`
                : 'No skill whenToUse provided.'
            const description = typeof schema.description === 'string' ? schema.description : ''
            const prompt = `Rate the clarity and specificity of the following Schema description on a scale 1.0-5.0. ${skillBlock} Schema description: "${description}"`
            return prompt
        }

        if( dimension === 'parameters' ) {
            const tools = schema.tools !== undefined && schema.tools !== null ? schema.tools : {}
            const prompt = `Rate how well the parameter descriptions in the following schema enable an LLM to call the tools correctly on a scale 1.0-5.0. Schema: ${JSON.stringify( tools )}`
            return prompt
        }

        throw new Error( `GradeReporter._buildPromptForDimension: unknown dimension '${dimension}'` )
    }


    static _computeGradeFromScore( score ) {
        const match = GRADE_THRESHOLDS
            .find( ( [ , threshold ] ) => score >= threshold )

        if( match !== undefined ) {
            const [ grade ] = match
            return grade
        }

        return 'D'
    }


    static _formatSuggestedFileName( schemaId, datePart ) {
        const normalized = schemaId.replace( /\//g, '_' )
        const fileName = `${normalized}-${datePart}.json`
        return fileName
    }


    static _validateScoreInput( scores ) {
        if( !Array.isArray( scores ) ) {
            throw new Error( 'GradeReporter: scores must be an array' )
        }

        scores
            .forEach( ( entry, index ) => {
                if( entry === null || entry === undefined || typeof entry !== 'object' ) {
                    throw new Error( `GradeReporter: scores[${index}] must be an object` )
                }
                if( typeof entry.dimension !== 'string' ) {
                    throw new Error( `GradeReporter: scores[${index}].dimension must be a string` )
                }
                if( typeof entry.score !== 'number' || Number.isNaN( entry.score ) ) {
                    throw new Error( `GradeReporter: scores[${index}].score must be a number` )
                }
            } )
    }

}
