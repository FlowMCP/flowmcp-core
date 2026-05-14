import { describe, it, expect } from '@jest/globals'
import { MainValidator } from '../../../src/v4/task/MainValidator.mjs'


function buildMeta() {
    return {
        isReadOnly: true,
        isConcurrencySafe: true,
        isDestructive: false,
        searchHint: 'fetch data',
        aliases: [],
        alwaysLoad: false
    }
}


function buildTool( overrides = {} ) {
    return {
        method: 'GET',
        path: '/api',
        description: 'd',
        parameters: [],
        meta: buildMeta(),
        ...overrides
    }
}


function buildValidMain( overrides = {} ) {
    return {
        namespace: 'etherscan-io',
        name: 'contracts',
        description: 'd',
        version: '4.0.0',
        root: 'https://api.etherscan.io',
        tools: {
            getAbi: buildTool()
        },
        ...overrides
    }
}


describe( 'v4 MainValidator', () => {

    describe( 'top-level guards', () => {
        it( 'rejects undefined main', () => {
            const { status, messages } = MainValidator.validate( { main: undefined } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Missing export' ) ) ).toBe( true )
        } )

        it( 'rejects null main', () => {
            const { status, messages } = MainValidator.validate( { main: null } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Missing export' ) ) ).toBe( true )
        } )

        it( 'rejects array as main', () => {
            const { status, messages } = MainValidator.validate( { main: [] } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'plain object' ) ) ).toBe( true )
        } )
    } )

    describe( 'happy path', () => {
        it( 'accepts a valid v4 main with namespace containing dash', () => {
            const main = buildValidMain()
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'accepts a namespace containing digits (Bug #47)', () => {
            const main = buildValidMain( { namespace: 'solana1' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'accepts namespace coingecko-pro', () => {
            const main = buildValidMain( { namespace: 'coingecko-pro' } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )
    } )

    describe( 'Bug #47 — namespace regex', () => {
        it( 'rejects uppercase namespace', () => {
            const main = buildValidMain( { namespace: 'Etherscan' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'main.namespace' ) && m.includes( 'pattern' ) ) ).toBe( true )
        } )

        it( 'rejects namespace starting with digit', () => {
            const main = buildValidMain( { namespace: '1etherscan' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'main.namespace' ) && m.includes( 'pattern' ) ) ).toBe( true )
        } )

        it( 'rejects namespace starting with dash', () => {
            const main = buildValidMain( { namespace: '-etherscan' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'main.namespace' ) ) ).toBe( true )
        } )

        it( 'rejects namespace with underscore', () => {
            const main = buildValidMain( { namespace: 'etherscan_io' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'main.namespace' ) ) ).toBe( true )
        } )
    } )

    describe( 'VAL108 — version pattern', () => {
        it( 'rejects version 3.0.0', () => {
            const main = buildValidMain( { version: '3.0.0' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL108' ) ) ).toBe( true )
        } )

        it( 'rejects version 2.0.0', () => {
            const main = buildValidMain( { version: '2.0.0' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL108' ) ) ).toBe( true )
        } )

        it( 'accepts version 4.0.0', () => {
            const main = buildValidMain( { version: '4.0.0' } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )

        it( 'accepts version 4.12.5', () => {
            const main = buildValidMain( { version: '4.12.5' } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )

        it( 'rejects malformed version 4.0', () => {
            const main = buildValidMain( { version: '4.0' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL108' ) ) ).toBe( true )
        } )
    } )

    describe( 'VAL109 — main.skills forbidden', () => {
        it( 'rejects when main.skills is present', () => {
            const main = buildValidMain( { skills: { foo: { file: 'foo.mjs' } } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL109' ) ) ).toBe( true )
        } )

        it( 'rejects when main.skills is an empty object', () => {
            const main = buildValidMain( { skills: {} } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL109' ) ) ).toBe( true )
        } )
    } )

    describe( 'VAL100 — meta block mandatory', () => {
        it( 'rejects tool without meta', () => {
            const tool = buildTool()
            delete tool.meta
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL100' ) ) ).toBe( true )
        } )

        it( 'rejects tool with meta === null', () => {
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta: null } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL100' ) ) ).toBe( true )
        } )

        it( 'rejects tool with meta as array', () => {
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta: [] } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL100' ) && m.includes( 'plain object' ) ) ).toBe( true )
        } )
    } )

    describe( 'VAL101-VAL106 — individual meta fields', () => {
        it( 'reports all 6 missing meta fields when meta = {}', () => {
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta: {} } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            const codes = [ 'VAL101', 'VAL102', 'VAL103', 'VAL104', 'VAL105', 'VAL106' ]
            codes
                .forEach( ( code ) => {
                    expect( messages.some( ( m ) => m.startsWith( code ) ) ).toBe( true )
                } )
        } )

        it( 'VAL101: rejects isReadOnly with wrong type', () => {
            const meta = { ...buildMeta(), isReadOnly: 'yes' }
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL101' ) ) ).toBe( true )
        } )

        it( 'VAL102: rejects isConcurrencySafe wrong type', () => {
            const meta = { ...buildMeta(), isConcurrencySafe: 1 }
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL102' ) ) ).toBe( true )
        } )

        it( 'VAL103: rejects isDestructive missing', () => {
            const meta = { ...buildMeta() }
            delete meta.isDestructive
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL103' ) ) ).toBe( true )
        } )

        it( 'VAL104: rejects searchHint wrong type', () => {
            const meta = { ...buildMeta(), searchHint: 123 }
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL104' ) ) ).toBe( true )
        } )

        it( 'VAL105: rejects aliases when not array', () => {
            const meta = { ...buildMeta(), aliases: 'foo' }
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL105' ) ) ).toBe( true )
        } )

        it( 'VAL106: rejects alwaysLoad wrong type', () => {
            const meta = { ...buildMeta(), alwaysLoad: 'true' }
            const main = buildValidMain( { tools: { getAbi: buildTool( { meta } ) } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL106' ) ) ).toBe( true )
        } )
    } )

    describe( 'VAL107 — enum shared-list reference', () => {
        function paramWithEnum( enumValue ) {
            return {
                position: { key: 'k', value: 'v', location: 'query' },
                z: { primitive: 'string', enum: enumValue }
            }
        }

        it( 'rejects literal enum entry', () => {
            const tool = buildTool( { parameters: [ paramWithEnum( [ 'literal-value' ] ) ] } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL107' ) ) ).toBe( true )
        } )

        it( 'rejects enum as non-array', () => {
            const tool = buildTool( { parameters: [ paramWithEnum( 'literal-value' ) ] } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL107' ) ) ).toBe( true )
        } )

        it( 'accepts valid shared-list reference', () => {
            const tool = buildTool( { parameters: [ paramWithEnum( [ '{{chains:eth}}', '{{chains:base}}' ] ) ] } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'rejects entries with invalid format', () => {
            const tool = buildTool( { parameters: [ paramWithEnum( [ '{{chains}}' ] ) ] } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL107' ) ) ).toBe( true )
        } )
    } )

    describe( 'top-level field validation', () => {
        it( 'reports missing required fields', () => {
            const { status, messages } = MainValidator.validate( { main: {} } )
            expect( status ).toBe( false )
            const required = [ 'namespace', 'name', 'description', 'version', 'root' ]
            required
                .forEach( ( field ) => {
                    expect( messages.some( ( m ) => m.includes( `main.${field}` ) ) ).toBe( true )
                } )
        } )

        it( 'requires at least tools or resources', () => {
            const main = {
                namespace: 'a',
                name: 'b',
                description: 'd',
                version: '4.0.0',
                root: 'https://x.io'
            }
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'main.tools' ) ) ).toBe( true )
        } )

        it( 'rejects max tools > 8', () => {
            const tools = {}
            ;[ 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9' ]
                .forEach( ( name ) => {
                    tools[ name ] = buildTool()
                } )
            const main = buildValidMain( { tools } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Maximum 8 tools' ) ) ).toBe( true )
        } )

        it( 'rejects root without https://', () => {
            const main = buildValidMain( { root: 'http://api.x.io' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'main.root' ) && m.includes( 'https://' ) ) ).toBe( true )
        } )

        it( 'rejects root with trailing slash', () => {
            const main = buildValidMain( { root: 'https://api.x.io/' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'trailing slash' ) ) ).toBe( true )
        } )

        it( 'warns on empty root', () => {
            const main = buildValidMain( { root: '' } )
            const { status, warnings } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( warnings.some( ( w ) => w.includes( 'Empty root URL' ) ) ).toBe( true )
        } )
    } )

    describe( 'tools/routes validation', () => {
        it( 'reports missing route method', () => {
            const tool = buildTool()
            delete tool.method
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'getAbi.method' ) ) ).toBe( true )
        } )

        it( 'rejects invalid method', () => {
            const tool = buildTool( { method: 'PATCH' } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Must be one of' ) ) ).toBe( true )
        } )

        it( 'accepts routes key as alias for tools', () => {
            const main = {
                namespace: 'etherscan-io',
                name: 'contracts',
                description: 'd',
                version: '4.0.0',
                root: 'https://api.etherscan.io',
                routes: { getAbi: buildTool() }
            }
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )

        it( 'emits TST001 warning for low test count', () => {
            const main = buildValidMain()
            const { warnings } = MainValidator.validate( { main } )
            expect( warnings.some( ( w ) => w.startsWith( 'TST001' ) ) ).toBe( true )
        } )
    } )

    describe( 'resources validation', () => {
        function buildResource() {
            return {
                source: 'sqlite',
                description: 'desc',
                database: 'data.db',
                queries: { byId: {} }
            }
        }

        it( 'accepts a valid resource', () => {
            const main = buildValidMain( { resources: { stuff: buildResource() } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'rejects more than 2 resources', () => {
            const main = buildValidMain( {
                resources: {
                    a: buildResource(),
                    b: buildResource(),
                    c: buildResource()
                }
            } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'Maximum 2 resources' ) ) ).toBe( true )
        } )

        it( 'rejects database without .db suffix', () => {
            const resource = { ...buildResource(), database: 'data.sqlite' }
            const main = buildValidMain( { resources: { stuff: resource } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'database' ) && m.includes( '.db' ) ) ).toBe( true )
        } )
    } )

    describe( 'parameters validation', () => {
        it( 'rejects parameters as non-array', () => {
            const tool = buildTool( { parameters: 'not-array' } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'parameters' ) && m.includes( 'array' ) ) ).toBe( true )
        } )

        it( 'rejects parameter with invalid location', () => {
            const param = { position: { key: 'k', value: 'v', location: 'header' }, z: { primitive: 'string' } }
            const tool = buildTool( { parameters: [ param ] } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'location' ) ) ).toBe( true )
        } )
    } )

    describe( 'sharedLists validation', () => {
        it( 'rejects sharedLists missing ref', () => {
            const main = buildValidMain( { sharedLists: [ { version: '1.0.0' } ] } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'sharedLists[0].ref' ) ) ).toBe( true )
        } )

        it( 'rejects sharedLists when not array', () => {
            const main = buildValidMain( { sharedLists: {} } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'sharedLists' ) ) ).toBe( true )
        } )
    } )
} )
