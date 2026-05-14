import { describe, it, expect } from '@jest/globals'
import { MetaGenerator } from '../../../src/v4/task/MetaGenerator.mjs'


describe( 'MetaGenerator', () => {
    describe( 'generate()', () => {
        it( 'GET method results in isReadOnly true', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'Get contract ABI' },
                toolName: 'getAbi'
            } )
            expect( meta.isReadOnly ).toBe( true )
        } )

        it( 'POST method results in isReadOnly false', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'POST', description: 'Submit a transaction' },
                toolName: 'submitTx'
            } )
            expect( meta.isReadOnly ).toBe( false )
        } )

        it( 'isConcurrencySafe equals isReadOnly for GET', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'Read data' },
                toolName: 'readData'
            } )
            expect( meta.isConcurrencySafe ).toBe( true )
            expect( meta.isReadOnly ).toBe( true )
        } )

        it( 'isConcurrencySafe equals isReadOnly for POST', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'POST', description: 'Write data' },
                toolName: 'writeData'
            } )
            expect( meta.isConcurrencySafe ).toBe( false )
            expect( meta.isReadOnly ).toBe( false )
        } )

        it( 'isDestructive is inverse of isReadOnly', () => {
            const readMeta = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'Read' },
                toolName: 'read'
            } ).meta

            const writeMeta = MetaGenerator.generate( {
                tool: { method: 'POST', description: 'Write' },
                toolName: 'write'
            } ).meta

            expect( readMeta.isDestructive ).toBe( false )
            expect( writeMeta.isDestructive ).toBe( true )
        } )

        it( 'searchHint is first 100 chars of description', () => {
            const longDesc = 'A'.repeat( 200 )
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: longDesc },
                toolName: 'longTool'
            } )
            expect( meta.searchHint ).toHaveLength( 100 )
            expect( meta.searchHint ).toBe( 'A'.repeat( 100 ) )
        } )

        it( 'searchHint preserves short descriptions as-is', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'Short text' },
                toolName: 'short'
            } )
            expect( meta.searchHint ).toBe( 'Short text' )
        } )

        it( 'searchHint is empty string when description is missing', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET' },
                toolName: 'noDesc'
            } )
            expect( meta.searchHint ).toBe( '' )
        } )

        it( 'searchHint is empty string when description is not a string', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: 12345 },
                toolName: 'badDesc'
            } )
            expect( meta.searchHint ).toBe( '' )
        } )

        it( 'aliases is always []', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'test' },
                toolName: 'anyTool'
            } )
            expect( meta.aliases ).toEqual( [] )
        } )

        it( 'alwaysLoad is always false', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'test' },
                toolName: 'anyTool'
            } )
            expect( meta.alwaysLoad ).toBe( false )
        } )

        it( 'returns all 6 meta fields', () => {
            const { meta } = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'Get contract ABI' },
                toolName: 'getAbi'
            } )
            expect( Object.keys( meta ) ).toEqual(
                expect.arrayContaining( [
                    'isReadOnly', 'isConcurrencySafe', 'isDestructive',
                    'searchHint', 'aliases', 'alwaysLoad'
                ] )
            )
        } )

        it( 'returns wrapped object with meta key', () => {
            const result = MetaGenerator.generate( {
                tool: { method: 'GET', description: 'test' },
                toolName: 'tool'
            } )
            expect( result ).toHaveProperty( 'meta' )
            expect( typeof result.meta ).toBe( 'object' )
        } )
    } )

    describe( 'generateForSchema()', () => {
        it( 'returns empty Map when schema has no tools', () => {
            const { metaMap } = MetaGenerator.generateForSchema( { schema: {} } )
            expect( metaMap ).toBeInstanceOf( Map )
            expect( metaMap.size ).toBe( 0 )
        } )

        it( 'returns empty Map when tools is null', () => {
            const { metaMap } = MetaGenerator.generateForSchema( { schema: { tools: null } } )
            expect( metaMap ).toBeInstanceOf( Map )
            expect( metaMap.size ).toBe( 0 )
        } )

        it( 'returns entry for each tool in schema', () => {
            const schema = {
                tools: {
                    getAbi: { method: 'GET', description: 'Get ABI' },
                    postTx: { method: 'POST', description: 'Post transaction' }
                }
            }
            const { metaMap } = MetaGenerator.generateForSchema( { schema } )
            expect( metaMap.size ).toBe( 2 )
            expect( metaMap.has( 'getAbi' ) ).toBe( true )
            expect( metaMap.has( 'postTx' ) ).toBe( true )
        } )

        it( 'applies correct heuristic per tool', () => {
            const schema = {
                tools: {
                    readTool: { method: 'GET', description: 'Read something' },
                    writeTool: { method: 'POST', description: 'Write something' }
                }
            }
            const { metaMap } = MetaGenerator.generateForSchema( { schema } )
            expect( metaMap.get( 'readTool' ).isReadOnly ).toBe( true )
            expect( metaMap.get( 'readTool' ).isDestructive ).toBe( false )
            expect( metaMap.get( 'writeTool' ).isReadOnly ).toBe( false )
            expect( metaMap.get( 'writeTool' ).isDestructive ).toBe( true )
        } )

        it( 'each meta entry has all 6 fields', () => {
            const schema = {
                tools: {
                    aTool: { method: 'GET', description: 'desc' }
                }
            }
            const { metaMap } = MetaGenerator.generateForSchema( { schema } )
            const meta = metaMap.get( 'aTool' )
            expect( meta ).toEqual( {
                isReadOnly: true,
                isConcurrencySafe: true,
                isDestructive: false,
                searchHint: 'desc',
                aliases: [],
                alwaysLoad: false
            } )
        } )
    } )
} )
