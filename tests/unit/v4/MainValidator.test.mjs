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

    describe( 'VAL014 — version pattern', () => {
        it( 'rejects version 3.0.0', () => {
            const main = buildValidMain( { version: '3.0.0' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL014' ) ) ).toBe( true )
        } )

        it( 'rejects version 2.0.0', () => {
            const main = buildValidMain( { version: '2.0.0' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL014' ) ) ).toBe( true )
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
            expect( messages.some( ( m ) => m.startsWith( 'VAL014' ) ) ).toBe( true )
        } )
    } )

    describe( 'VAL016 — main.skills forbidden', () => {
        it( 'rejects when main.skills is present', () => {
            const main = buildValidMain( { skills: { foo: { file: 'foo.mjs' } } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL016' ) ) ).toBe( true )
        } )

        it( 'rejects when main.skills is an empty object', () => {
            const main = buildValidMain( { skills: {} } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL016' ) ) ).toBe( true )
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

        it( 'rejects routes key fail-loud (Memo 152 / PRD-006, G-03 — no v2 alias)', () => {
            const main = {
                namespace: 'etherscan-io',
                name: 'contracts',
                description: 'd',
                version: '4.0.0',
                root: 'https://api.etherscan.io',
                routes: { getAbi: buildTool() }
            }
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'main.routes' ) ) ).toBe( true )
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

        function buildMarkdownResource() {
            return {
                source: 'markdown',
                origin: 'inline',
                name: 'test-about.md',
                description: 'About this namespace'
            }
        }

        it( 'accepts a valid markdown resource (about)', () => {
            const main = buildValidMain( { resources: { about: buildMarkdownResource() } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'rejects markdown name without .md suffix', () => {
            const resource = { ...buildMarkdownResource(), name: 'test-about' }
            const main = buildValidMain( { resources: { about: resource } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'name' ) && m.includes( '.md' ) ) ).toBe( true )
        } )

        it( 'rejects markdown resource missing origin', () => {
            const resource = { source: 'markdown', name: 'test-about.md', description: 'd' }
            const main = buildValidMain( { resources: { about: resource } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'origin' ) && m.includes( 'Missing' ) ) ).toBe( true )
        } )

        it( 'rejects markdown resource carrying database/queries', () => {
            const resource = { ...buildMarkdownResource(), database: 'x.db', queries: {} }
            const main = buildValidMain( { resources: { about: resource } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'database' ) && m.includes( 'Not allowed' ) ) ).toBe( true )
        } )

        it( 'rejects an unknown resource source', () => {
            const resource = { source: 'yaml', origin: 'inline', name: 'x.yaml', description: 'd' }
            const main = buildValidMain( { resources: { thing: resource } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'source' ) && m.includes( 'markdown' ) ) ).toBe( true )
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

    describe( 'PB-2 — strict key validation (unknown/dead keys)', () => {
        it( 'VAL003: rejects an unknown key at the main level', () => {
            const main = buildValidMain( { foobar: 'dead-key' } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL003' ) && m.includes( 'main.foobar' ) ) ).toBe( true )
        } )

        it( 'VAL076: rejects an unknown key at the tool level', () => {
            const tool = buildTool( { bogusField: true } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL076' ) && m.includes( 'getAbi.bogusField' ) ) ).toBe( true )
        } )

        it( 'VAL077: rejects an unknown key at the parameter level', () => {
            const param = {
                position: { key: 'k', value: 'v', location: 'query' },
                z: { primitive: 'string' },
                rogueKey: 1
            }
            const tool = buildTool( { parameters: [ param ] } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.startsWith( 'VAL077' ) && m.includes( 'rogueKey' ) ) ).toBe( true )
        } )

        it( 'accepts all known optional main keys (docs, schemaVersion, termsOfService, dataLicense)', () => {
            const main = buildValidMain( {
                docs: [ 'https://docs.example.com' ],
                schemaVersion: '1.0.0',
                termsOfService: 'https://example.com/tos',
                termsOfServiceCheckedAt: '2026-06-03',
                termsOfServiceLanguage: 'en',
                dataLicense: 'https://example.com/license',
                dataLicenseName: 'CC-BY-4.0',
                headers: { Accept: 'application/json' }
            } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )

        it( 'accepts known tool key outputSchema and parameter key description', () => {
            const param = {
                position: { key: 'k', value: 'v', location: 'query' },
                z: { primitive: 'string' },
                description: 'a parameter'
            }
            const tool = buildTool( { parameters: [ param ], outputSchema: { type: 'object' } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages ).toHaveLength( 0 )
        } )
    } )

    describe( 'PB-4 — docs/ToS warnings (VAL027/VAL028)', () => {
        it( 'VAL027: warns when docs is missing', () => {
            const main = buildValidMain( { termsOfService: 'no-tos-found' } )
            const { status, warnings } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( warnings.some( ( w ) => w.startsWith( 'VAL027' ) ) ).toBe( true )
        } )

        it( 'VAL027: warns when docs is an empty array', () => {
            const main = buildValidMain( { docs: [], termsOfService: 'no-tos-found' } )
            const { warnings } = MainValidator.validate( { main } )
            expect( warnings.some( ( w ) => w.startsWith( 'VAL027' ) ) ).toBe( true )
        } )

        it( 'VAL028: warns when termsOfService is missing', () => {
            const main = buildValidMain( { docs: [ 'https://docs.example.com' ] } )
            const { status, warnings } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( warnings.some( ( w ) => w.startsWith( 'VAL028' ) ) ).toBe( true )
        } )

        it( 'docs/ToS warnings are warnings, never hard errors', () => {
            const main = buildValidMain()
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
            expect( messages.some( ( m ) => m.startsWith( 'VAL027' ) || m.startsWith( 'VAL028' ) ) ).toBe( false )
        } )

        it( 'no docs/ToS warning when both are valid (URL form)', () => {
            const main = buildValidMain( {
                docs: [ 'https://docs.example.com' ],
                termsOfService: 'https://example.com/tos'
            } )
            const { warnings } = MainValidator.validate( { main } )
            expect( warnings.some( ( w ) => w.startsWith( 'VAL027' ) ) ).toBe( false )
            expect( warnings.some( ( w ) => w.startsWith( 'VAL028' ) ) ).toBe( false )
        } )

        it( 'no VAL028 warning when termsOfService is the sentinel "no-tos-found"', () => {
            const main = buildValidMain( {
                docs: [ 'https://docs.example.com' ],
                termsOfService: 'no-tos-found'
            } )
            const { warnings } = MainValidator.validate( { main } )
            expect( warnings.some( ( w ) => w.startsWith( 'VAL028' ) ) ).toBe( false )
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


    // Memo 152 / PRD-010, F-02 diff-check — output/preload coverage ported from the
    // superseded tests/v2/v2-main-validator suite (v4 MainValidator keeps the
    // #validateOutput / #validatePreload logic but the v4 suite lacked coverage).
    describe( 'output validation (ported from v2)', () => {
        it( 'rejects an unsupported output mimeType', () => {
            const tool = buildTool( { output: { mimeType: 'text/html', schema: { type: 'string' } } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'output.mimeType' ) ) ).toBe( true )
        } )

        it( 'fails when output schema is missing', () => {
            const tool = buildTool( { output: { mimeType: 'application/json' } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'output.schema' ) ) ).toBe( true )
        } )

        it( 'fails when output schema type is missing', () => {
            const tool = buildTool( { output: { mimeType: 'application/json', schema: {} } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'output.schema.type' ) ) ).toBe( true )
        } )

        it( 'passes valid image/png output with base64 format', () => {
            const tool = buildTool( { output: { mimeType: 'image/png', schema: { type: 'string', format: 'base64' } } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )

        it( 'passes valid text/plain output', () => {
            const tool = buildTool( { output: { mimeType: 'text/plain', schema: { type: 'string' } } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )

        it( 'passes when output is omitted from a tool', () => {
            const main = buildValidMain( { tools: { getAbi: buildTool() } } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )
    } )


    describe( 'preload validation (ported from v2)', () => {
        it( 'passes a valid preload block', () => {
            const tool = buildTool( { preload: { enabled: true, ttl: 60, description: 'warm cache' } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )

        it( 'passes preload without optional description', () => {
            const tool = buildTool( { preload: { enabled: false, ttl: 30 } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )

        it( 'fails when preload.enabled is missing', () => {
            const tool = buildTool( { preload: { ttl: 30 } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'preload.enabled' ) ) ).toBe( true )
        } )

        it( 'fails when preload.enabled is not boolean', () => {
            const tool = buildTool( { preload: { enabled: 'yes', ttl: 30 } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'preload.enabled' ) ) ).toBe( true )
        } )

        it( 'fails when preload.ttl is missing', () => {
            const tool = buildTool( { preload: { enabled: true } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'preload.ttl' ) ) ).toBe( true )
        } )

        it( 'fails when preload.ttl is not a positive integer', () => {
            const tool = buildTool( { preload: { enabled: true, ttl: -5 } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'preload.ttl' ) ) ).toBe( true )
        } )

        it( 'fails when preload.description is not a string', () => {
            const tool = buildTool( { preload: { enabled: true, ttl: 30, description: 123 } } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'preload.description' ) ) ).toBe( true )
        } )

        it( 'fails when preload is not a plain object', () => {
            const tool = buildTool( { preload: [ 1, 2, 3 ] } )
            const main = buildValidMain( { tools: { getAbi: tool } } )
            const { status, messages } = MainValidator.validate( { main } )
            expect( status ).toBe( false )
            expect( messages.some( ( m ) => m.includes( 'preload' ) ) ).toBe( true )
        } )

        it( 'passes when preload is omitted', () => {
            const main = buildValidMain( { tools: { getAbi: buildTool() } } )
            const { status } = MainValidator.validate( { main } )
            expect( status ).toBe( true )
        } )
    } )
} )
