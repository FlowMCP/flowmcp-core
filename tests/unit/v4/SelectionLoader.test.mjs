import { describe, it, expect } from '@jest/globals'
import { SelectionLoader } from '../../../src/v4/task/SelectionLoader.mjs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )

const fixturesDir = join( __dirname, 'fixtures' )

describe( 'SelectionLoader', () => {
    describe( 'load()', () => {
        it( 'returns { selection } for a valid file with selection export', async () => {
            const filePath = join( fixturesDir, 'pipeline', 'selections', 'valid-selection.mjs' )
            const { selection } = await SelectionLoader.load( { filePath } )

            expect( selection ).toBeDefined()
            expect( typeof selection ).toBe( 'object' )
        } )

        it( 'throws when file has no selection export', async () => {
            const filePath = join( fixturesDir, 'selection-loader', 'no-selection-export.mjs' )

            await expect( SelectionLoader.load( { filePath } ) )
                .rejects
                .toThrow( /No 'selection' export found/ )
        } )

        it( 'throws when filePath points to non-existent file', async () => {
            const filePath = join( fixturesDir, 'does-not-exist.mjs' )

            await expect( SelectionLoader.load( { filePath } ) )
                .rejects
                .toThrow()
        } )

        it( 'returns the exact selection object (no wrapping, no copying)', async () => {
            const filePath = join( fixturesDir, 'pipeline', 'selections', 'valid-selection.mjs' )
            const { selection } = await SelectionLoader.load( { filePath } )

            const module = await import( filePath )
            expect( selection ).toBe( module.selection )
        } )
    } )
} )
