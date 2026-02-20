import { FlowMCP } from '../../../src/v1/index.mjs'

let originalWarn
beforeEach( () => {
    originalWarn = console.warn
    console.warn = () => {} // Suppress console.warn output
} )

afterEach( () => {
    console.warn = originalWarn
} )


describe( 'FlowMCP.getArgvParameters', () => {
    let originalArgv

    beforeEach( () => {
        // Save original process.argv
        originalArgv = process.argv
    } )

    afterEach( () => {
        // Restore original process.argv
        process.argv = originalArgv
    } )

    it( 'parses all parameter types correctly', () => {
        process.argv = [
            'node',
            'script.mjs',
            '--source=local',
            '--includeNamespaces=lukso,ethereum',
            '--excludeNamespaces=testnet',
            '--activateTags=blockchain,crypto'
        ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( result ).toEqual( {
            source: 'local',
            includeNamespaces: [ 'lukso', 'ethereum' ],
            excludeNamespaces: [ 'testnet' ],
            activateTags: [ 'blockchain', 'crypto' ]
        } )
    } )

    it( 'handles empty parameter values', () => {
        process.argv = [
            'node',
            'script.mjs',
            '--includeNamespaces=',
            '--excludeNamespaces=',
            '--activateTags='
        ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [ 'default' ],
            excludeNamespaces: [ 'default' ],
            activateTags: [ 'default' ]
        } )

        expect( result ).toEqual( {
            source: 'unknown',
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )
    } )

    it( 'uses default values when no arguments provided', () => {
        process.argv = [ 'node', 'script.mjs' ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [ 'default1' ],
            excludeNamespaces: [ 'default2' ],
            activateTags: [ 'default3' ]
        } )

        expect( result ).toEqual( {
            source: 'unknown',
            includeNamespaces: [ 'default1' ],
            excludeNamespaces: [ 'default2' ],
            activateTags: [ 'default3' ]
        } )
    } )

    it( 'handles single value parameters', () => {
        process.argv = [
            'node',
            'script.mjs',
            '--includeNamespaces=single',
            '--activateTags=one'
        ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( result ).toEqual( {
            source: 'unknown',
            includeNamespaces: [ 'single' ],
            excludeNamespaces: [],
            activateTags: [ 'one' ]
        } )
    } )

    it( 'handles source parameter as array conversion', () => {
        process.argv = [
            'node',
            'script.mjs',
            '--source=remote,backup'
        ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( result ).toEqual( {
            source: 'remote',  // Takes first value when array
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )
    } )

    it( 'ignores unknown parameters', () => {
        process.argv = [
            'node',
            'script.mjs',
            '--unknown=value',
            '--includeNamespaces=valid',
            '--anotherUnknown=test'
        ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( result ).toEqual( {
            source: 'unknown',
            includeNamespaces: [ 'valid' ],
            excludeNamespaces: [],
            activateTags: []
        } )
    } )

    it( 'handles complex comma-separated values with spaces', () => {
        process.argv = [
            'node',
            'script.mjs',
            '--activateTags=blockchain,lukso.getBlocks,ethereum.!transfer'
        ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( result ).toEqual( {
            source: 'unknown',
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'blockchain', 'lukso.getBlocks', 'ethereum.!transfer' ]
        } )
    } )

    it( 'filters out empty strings from comma-separated lists', () => {
        process.argv = [
            'node',
            'script.mjs',
            '--includeNamespaces=lukso,,ethereum,',
            '--activateTags=,blockchain,,crypto,'
        ]

        const result = FlowMCP.getArgvParameters( {
            argv: process.argv,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( result ).toEqual( {
            source: 'unknown',
            includeNamespaces: [ 'lukso', 'ethereum' ],
            excludeNamespaces: [],
            activateTags: [ 'blockchain', 'crypto' ]
        } )
    } )
} )