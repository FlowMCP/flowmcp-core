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

        it( 'STRUCT: fails when namespace is missing', () => {
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

    describe( 'VAL110 Slash-Rule', () => {
        it( 'passes when tool entries contain /', () => {
            const { valid } = SelectionValidator.validate( { selection: validSelection } )
            expect( valid ).toBe( true )
        } )

        it( 'VAL110: rejects tool entries without /', () => {
            const sel = { ...validSelection, tools: [ 'localTool' ] }
            const { valid, errors } = SelectionValidator.validate( { selection: sel } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.startsWith( 'VAL110' ) && e.includes( 'localTool' ) ) ).toBe( true )
        } )

        it( 'VAL110: rejects skill entries with /', () => {
            const sel = { ...validSelection, skills: [ 'ns/skill/audit' ] }
            const { valid, errors } = SelectionValidator.validate( { selection: sel } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.startsWith( 'VAL110' ) && e.includes( 'ns/skill/audit' ) ) ).toBe( true )
        } )

        it( 'VAL110: accepts skill entries without /', () => {
            const sel = { ...validSelection, skills: [ 'mySkill' ] }
            const { valid } = SelectionValidator.validate( { selection: sel } )
            expect( valid ).toBe( true )
        } )
    } )

    describe( 'SEL003 Resolvability (with catalog)', () => {
        it( 'passes when all tool refs are in catalog', () => {
            const catalog = { tools: [ 'etherscan-io/tool/getAbi' ] }
            const { valid, errors } = SelectionValidator
                .validate( { selection: validSelection, catalog } )
            expect( valid ).toBe( true )
            expect( errors ).toHaveLength( 0 )
        } )

        it( 'SEL003: fails when tool ref is not in catalog', () => {
            const catalog = { tools: [ 'other/tool/foo' ] }
            const { valid, errors } = SelectionValidator
                .validate( { selection: validSelection, catalog } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.startsWith( 'SEL003' ) ) ).toBe( true )
            expect( errors.some( e => e.includes( 'etherscan-io/tool/getAbi' ) ) ).toBe( true )
        } )

        it( 'SEL003: fails when resource ref is not in catalog', () => {
            const sel = {
                ...validSelection,
                resources: [ 'etherscan-io/resource/chainDb' ]
            }
            const catalog = { tools: [ 'etherscan-io/tool/getAbi' ], resources: [] }
            const { valid, errors } = SelectionValidator
                .validate( { selection: sel, catalog } )
            expect( valid ).toBe( false )
            expect( errors.some( e => e.startsWith( 'SEL003' ) && e.includes( 'resources' ) ) ).toBe( true )
        } )

        it( 'SEL003: not checked when catalog is undefined', () => {
            const { valid } = SelectionValidator.validate( { selection: validSelection } )
            expect( valid ).toBe( true )
        } )
    } )
} )
