import { describe, it, expect } from '@jest/globals'
import { CatalogIndex } from '../../../src/v4/task/CatalogIndex.mjs'


// Memo 152 / PRD-018 (D-07) — the namespace-catalog build ported out of the CLI.
// These tests pin the FROZEN index shape consumed by mcp-geo-app (Memo 128).

const fixtureSchemas = [
    {
        'source': 'development',
        'file': 'etherscan/etherscan.mjs',
        'main': {
            'namespace': 'etherscan',
            'tools': { 'getBalance': {}, 'getTx': {} },
            'resources': { 'gasOracle': {} },
            'prompts': {},
            'skills': [ { 'name': 'howto' } ]
        }
    },
    {
        'source': 'development',
        'file': 'etherscan/etherscan-part2.mjs',
        'main': {
            'namespace': 'etherscan',
            'tools': { 'getLogs': {} }
        }
    },
    {
        'source': 'financial-clarity',
        'file': 'etherscan/etherscan.mjs',
        'main': {
            'namespace': 'etherscan',
            'tools': { 'getBalance': {} }
        }
    },
    {
        'source': 'development',
        'file': 'broken/missing-namespace.mjs',
        'main': { 'tools': { 'x': {} } }
    }
]


describe( 'CatalogIndex.build (Memo 152 / PRD-018 D-07)', () => {
    it( 'produces the frozen index key set', () => {
        const { index } = CatalogIndex.build( { schemas: fixtureSchemas } )

        expect( Object.keys( index ) ).toEqual( [
            'tools', 'resources', 'prompts', 'skills',
            'containers', 'collisions', 'builtAt', 'schemaCount'
        ] )
    } )


    it( 'records tool/resource/prompt/skill spec-ids with file+source', () => {
        const { index } = CatalogIndex.build( { schemas: fixtureSchemas } )

        expect( index[ 'tools' ][ 'etherscan/tool/getTx' ] ).toEqual( {
            'file': 'etherscan/etherscan.mjs', 'source': 'development', 'routeName': 'getTx'
        } )
        expect( index[ 'resources' ][ 'etherscan/resource/gasOracle' ] ).toEqual( {
            'file': 'etherscan/etherscan.mjs', 'source': 'development', 'resourceName': 'gasOracle'
        } )
        expect( index[ 'skills' ][ 'etherscan/skill/howto' ] ).toEqual( {
            'file': 'etherscan/etherscan.mjs', 'source': 'development', 'skillName': 'howto'
        } )
    } )


    it( 'records a cross-source collision (first-wins map, collision list carries both sources)', () => {
        const { index } = CatalogIndex.build( { schemas: fixtureSchemas } )

        const collision = index[ 'collisions' ]
            .find( ( c ) => c[ 'specId' ] === 'etherscan/tool/getBalance' )

        expect( collision ).toBeDefined()
        expect( collision[ 'sources' ] ).toEqual( [ 'development', 'financial-clarity' ] )
        expect( index[ 'tools' ][ 'etherscan/tool/getBalance' ][ 'source' ] ).toBe( 'development' )
    } )


    it( 'groups containers by namespace + base file name (part-suffix stripped)', () => {
        const { index } = CatalogIndex.build( { schemas: fixtureSchemas } )

        expect( index[ 'containers' ][ 'etherscan/etherscan/etherscan' ][ 'files' ] )
            .toEqual( [ 'etherscan/etherscan.mjs', 'etherscan/etherscan-part2.mjs', 'etherscan/etherscan.mjs' ] )
    } )


    it( 'skips schemas without a namespace and reports schemaCount over all entries', () => {
        const { index } = CatalogIndex.build( { schemas: fixtureSchemas } )

        expect( index[ 'schemaCount' ] ).toBe( 4 )
        const anyBroken = Object.keys( index[ 'tools' ] )
            .find( ( k ) => k.startsWith( 'undefined/' ) )
        expect( anyBroken ).toBeUndefined()
    } )


    it( 'is deterministic byte-for-byte for identical input (builtAt aside)', () => {
        const a = CatalogIndex.build( { schemas: fixtureSchemas } ).index
        const b = CatalogIndex.build( { schemas: fixtureSchemas } ).index

        const norm = ( idx ) => {
            const clone = JSON.parse( JSON.stringify( idx ) )
            clone[ 'builtAt' ] = 'FROZEN'

            return JSON.stringify( clone )
        }

        expect( norm( a ) ).toBe( norm( b ) )
    } )
} )


describe( 'CatalogIndex.formatCollisionWarnings', () => {
    it( 'renders one bundled warning per spec-id with the qualified fix', () => {
        const { warnings } = CatalogIndex.formatCollisionWarnings( {
            collisions: [ {
                'specId': 'etherscan/tool/getBalance',
                'files': [ 'a.mjs', 'b.mjs' ],
                'sources': [ 'development', 'financial-clarity' ]
            } ]
        } )

        expect( warnings.length ).toBe( 1 )
        expect( warnings[ 0 ][ 'message' ] ).toContain( 'development:etherscan/tool/getBalance' )
        expect( warnings[ 0 ][ 'message' ] ).toContain( 'financial-clarity:etherscan/tool/getBalance' )
    } )


    it( 'returns an empty list for no collisions', () => {
        expect( CatalogIndex.formatCollisionWarnings( { collisions: [] } ) ).toEqual( { warnings: [] } )
    } )
} )
