import { describe, test, expect } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlowMCP } from '../../../src/v4/index.mjs'


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const fixturePath = join( __dirname, 'fixtures', 'buildToolName.fixtures.json' )

const { cases } = JSON.parse( readFileSync( fixturePath, 'utf8' ) )


describe( 'FlowMCP.buildToolName — byte-identical to CLI wire contract (Memo 152 / PRD-006 A-05)', () => {
    test( 'exposes buildToolName as a public static', () => {
        expect( typeof FlowMCP.buildToolName ).toBe( 'function' )
    } )


    cases
        .forEach( ( { input, expected } ) => {
            const label = `${JSON.stringify( input )} -> ${expected}`

            test( `byte-identical: ${label}`, () => {
                const { toolName } = FlowMCP.buildToolName( input )

                expect( toolName ).toBe( expected )
            } )
        } )


    test( 'geo_station_geo wire name is preserved', () => {
        const { toolName } = FlowMCP.buildToolName( { routeName: 'geoStation', namespace: 'geo' } )

        expect( toolName ).toBe( 'geo_station_geo' )
    } )
} )
