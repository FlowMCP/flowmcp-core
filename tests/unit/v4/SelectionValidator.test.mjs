import { describe, it, expect } from '@jest/globals'
import { SelectionValidator } from '../../../src/v4/task/SelectionValidator.mjs'

const validSelection = {
    namespace: 'evm-research',
    name: 'contract-analysis',
    version: '1.0.0',
    description: 'Tools for EVM contract analysis',
    whenToUse: 'When analyzing smart contracts on EVM chains',
    tools: [ 'etherscan-io/tool/getAbi' ]
}

describe( 'SelectionValidator', () => {
    describe( 'validate()', () => {
        it( 'passes a valid selection', () => {
            const { valid, errors } = SelectionValidator.validate( { selection: validSelection } )
            expect( valid ).toBe( true )
            expect( errors ).toHaveLength( 0 )
        } )

        it( 'SEL001: fails when whenToUse is missing', () => {
            const sel = { ...validSelection, whenToUse: undefined }
            const { valid, errors } = SelectionValidator.validate( { selection: sel } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.startsWith( 'SEL001' ) ) ).toBe( true )
        } )

        it( 'SEL001: fails when whenToUse is empty string', () => {
            const sel = { ...validSelection, whenToUse: '  ' }
            const { valid, errors } = SelectionValidator.validate( { selection: sel } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.startsWith( 'SEL001' ) ) ).toBe( true )
        } )

        it( 'SEL002: fails when all array fields are empty', () => {
            const sel = { ...validSelection, tools: [], skills: [], resources: [], prompts: [] }
            const { valid, errors } = SelectionValidator.validate( { selection: sel } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.startsWith( 'SEL002' ) ) ).toBe( true )
        } )

        it( 'SEL003: fails when namespace is missing', () => {
            const { namespace: _ns, ...sel } = validSelection
            const { valid, errors } = SelectionValidator.validate( { selection: sel } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.includes( "'namespace'" ) ) ).toBe( true )
        } )

        it( 'returns multiple errors at once', () => {
            const { valid, errors } = SelectionValidator.validate( { selection: {} } )
            expect( valid ).toBe( false )
            expect( errors.length ).toBeGreaterThan( 1 )
        } )
    } )
} )
