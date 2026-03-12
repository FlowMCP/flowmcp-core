import { describe, test, expect } from '@jest/globals'
import { Pipeline } from '../../src/v2/task/Pipeline.mjs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const schemasDir = join( __dirname, 'fixtures', 'schemas' )
const listsDir = join( __dirname, 'fixtures', 'lists' )


describe( 'Pipeline v3 integration', () => {
    describe( 'tools-only v3 schema', () => {
        test( 'loads a v3 schema with only tools key', async () => {
            const filePath = join( schemasDir, 'v3-tools-only.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'testvtools' )
            expect( result['main']['version'] ).toBe( '3.0.0' )
            expect( result['main']['tools'] ).toBeDefined()
            expect( result['handlerMap']['getStatus'] ).toBeDefined()
            expect( result['handlerMap']['getHealth'] ).toBeDefined()
            expect( result['handlerMap']['getStatus']['preRequest'] ).toBeNull()
            expect( result['handlerMap']['getStatus']['postRequest'] ).toBeNull()
            expect( result['skills'] ).toEqual( {} )
        } )


        test( 'return shape includes new v3 fields', async () => {
            const filePath = join( schemasDir, 'v3-tools-only.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            const expectedKeys = [
                'status', 'messages', 'main', 'handlerMap',
                'resourceHandlerMap', 'sharedLists', 'libraries',
                'skills', 'warnings'
            ]

            expectedKeys
                .forEach( ( expectedKey ) => {
                    const found = Object.keys( result ).includes( expectedKey )

                    expect( found ).toBe( true )
                } )
        } )
    } )


    describe( 'v2 backward compatibility', () => {
        test( 'loads a v2 schema with routes key and produces deprecation warning', async () => {
            const filePath = join( schemasDir, 'valid-minimal.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['main']['namespace'] ).toBe( 'testminimal' )
            expect( result['main']['version'] ).toBe( '2.0.0' )
            expect( result['main']['tools'] ).toBeDefined()
            expect( result['handlerMap']['getStatus'] ).toBeDefined()

            const hasDeprecationWarning = result['warnings']
                .some( ( w ) => {
                    const match = w.includes( 'routes' ) && w.includes( 'Deprecated' )

                    return match
                } )

            expect( hasDeprecationWarning ).toBe( true )
        } )


        test( 'v2 schema with handlers still works after v3 changes', async () => {
            const filePath = join( schemasDir, 'valid-with-handlers.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['main']['namespace'] ).toBe( 'testhandlers' )
            expect( typeof result['handlerMap']['getUser']['postRequest'] ).toBe( 'function' )
        } )
    } )


    describe( 'tools + skills schema', () => {
        test( 'loads and validates skills alongside tools', async () => {
            const filePath = join( schemasDir, 'v3-tools-with-skills.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'testvskills' )
            expect( result['handlerMap']['getContractAbi'] ).toBeDefined()
            expect( result['skills']['valid-skill'] ).toBeDefined()
            expect( result['skills']['valid-skill']['name'] ).toBe( 'valid-skill' )
            expect( result['skills']['valid-skill']['version'] ).toBe( 'flowmcp-skill/1.0.0' )
            expect( Array.isArray( result['skills']['valid-skill']['placeholders'] ) ).toBe( true )
        } )
    } )


    describe( 'tools + resources schema', () => {
        test( 'validates resources alongside tools', async () => {
            const filePath = join( schemasDir, 'v3-tools-with-resources.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'testvresources' )
            expect( result['handlerMap']['getContractAbi'] ).toBeDefined()
            expect( result['main']['resources']['verifiedContracts'] ).toBeDefined()
            expect( result['main']['resources']['verifiedContracts']['source'] ).toBe( 'sqlite' )
        } )
    } )


    describe( 'full v3 schema (tools + resources + skills)', () => {
        test( 'processes a complete v3 schema with all three primitives', async () => {
            const filePath = join( schemasDir, 'v3-full.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'testvfull' )
            expect( result['main']['version'] ).toBe( '3.0.0' )

            expect( result['handlerMap']['getContractAbi'] ).toBeDefined()
            expect( result['main']['resources']['verifiedContracts'] ).toBeDefined()
            expect( result['skills']['valid-skill'] ).toBeDefined()
            expect( result['skills']['valid-skill']['name'] ).toBe( 'valid-skill' )
        } )


        test( 'full v3 schema returns complete result shape', async () => {
            const filePath = join( schemasDir, 'v3-full.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( typeof result['handlerMap'] ).toBe( 'object' )
            expect( typeof result['resourceHandlerMap'] ).toBe( 'object' )
            expect( typeof result['skills'] ).toBe( 'object' )
            expect( typeof result['sharedLists'] ).toBe( 'object' )
            expect( typeof result['libraries'] ).toBe( 'object' )
            expect( Array.isArray( result['warnings'] ) ).toBe( true )
        } )
    } )


    describe( 'resource-only schema (E1)', () => {
        test( 'processes a schema with only resources, no tools', async () => {
            const filePath = join( schemasDir, 'v3-resource-only.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( true )
            expect( result['messages'] ).toEqual( [] )
            expect( result['main']['namespace'] ).toBe( 'testvresonly' )
            expect( result['main']['resources']['tokenLookup'] ).toBeDefined()
            expect( result['main']['resources']['tokenLookup']['source'] ).toBe( 'sqlite' )
            expect( Object.keys( result['handlerMap'] ) ).toEqual( [] )
        } )
    } )


    describe( 'skill validation failure', () => {
        test( 'returns error when skill references non-existent tool', async () => {
            const filePath = join( schemasDir, 'v3-skill-bad-ref.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( false )

            const hasToolError = result['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'getContractAbi' ) && msg.includes( 'does not exist' )

                    return match
                } )

            expect( hasToolError ).toBe( true )
        } )
    } )


    describe( 'resource validation failure', () => {
        test( 'returns error when resource has invalid SQL', async () => {
            const filePath = join( schemasDir, 'v3-resource-bad-sql.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            expect( result['status'] ).toBe( false )

            const hasSqlError = result['messages']
                .some( ( msg ) => {
                    const match = msg.includes( 'DROP' ) || msg.includes( 'SELECT' )

                    return match
                } )

            expect( hasSqlError ).toBe( true )
        } )
    } )


    describe( 'ambiguous schema rejection', () => {
        test( 'rejects schema with both tools and routes keys', async () => {
            const filePath = join( schemasDir, 'valid-v3-tools-and-routes.mjs' )
            const result = await Pipeline
                .load( { filePath, listsDir, allowlist: null } )

            const hasAmbiguousWarning = result['warnings']
                .some( ( w ) => {
                    const match = w.includes( 'ambiguous' )

                    return match
                } )

            expect( hasAmbiguousWarning ).toBe( true )
        } )
    } )
} )
