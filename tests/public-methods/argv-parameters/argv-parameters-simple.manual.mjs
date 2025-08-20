import { FlowMCP } from '../../../src/index.mjs'
import assert from 'assert'


// Simple test for getArgvParameters functionality
console.log( 'Testing FlowMCP.getArgvParameters...' )

// Save original process.argv
const originalArgv = process.argv

try {
    // Test 1: Parse all parameter types correctly
    process.argv = [
        'node',
        'script.mjs',
        '--source=local',
        '--includeNamespaces=lukso,ethereum',
        '--excludeNamespaces=testnet',
        '--activateTags=blockchain,crypto'
    ]

    const result1 = FlowMCP.getArgvParameters( {
        argv: process.argv,
        includeNamespaces: [],
        excludeNamespaces: [],
        activateTags: []
    } )

    assert.strictEqual( result1.source, 'local' )
    assert.deepStrictEqual( result1.includeNamespaces, [ 'lukso', 'ethereum' ] )
    assert.deepStrictEqual( result1.excludeNamespaces, [ 'testnet' ] )
    assert.deepStrictEqual( result1.activateTags, [ 'blockchain', 'crypto' ] )
    console.log( '✅ Test 1 passed: Parse all parameter types correctly' )

    // Test 2: Handle empty parameter values
    process.argv = [
        'node',
        'script.mjs',
        '--includeNamespaces=',
        '--excludeNamespaces=',
        '--activateTags='
    ]

    const result2 = FlowMCP.getArgvParameters( {
        argv: process.argv,
        includeNamespaces: [ 'default' ],
        excludeNamespaces: [ 'default' ],
        activateTags: [ 'default' ]
    } )

    assert.strictEqual( result2.source, 'unknown' )
    assert.deepStrictEqual( result2.includeNamespaces, [] )
    assert.deepStrictEqual( result2.excludeNamespaces, [] )
    assert.deepStrictEqual( result2.activateTags, [] )
    console.log( '✅ Test 2 passed: Handle empty parameter values' )

    // Test 3: Use default values when no arguments provided
    process.argv = [ 'node', 'script.mjs' ]

    const result3 = FlowMCP.getArgvParameters( {
        argv: process.argv,
        includeNamespaces: [ 'default1' ],
        excludeNamespaces: [ 'default2' ],
        activateTags: [ 'default3' ]
    } )

    assert.strictEqual( result3.source, 'unknown' )
    assert.deepStrictEqual( result3.includeNamespaces, [ 'default1' ] )
    assert.deepStrictEqual( result3.excludeNamespaces, [ 'default2' ] )
    assert.deepStrictEqual( result3.activateTags, [ 'default3' ] )
    console.log( '✅ Test 3 passed: Use default values when no arguments provided' )

    console.log( '🎉 All getArgvParameters tests passed!' )

} catch( error ) {
    console.error( '❌ Test failed:', error.message )
    process.exit( 1 )
} finally {
    // Restore original process.argv
    process.argv = originalArgv
}