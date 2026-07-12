/**
 * Memo 152 / PRD-022 (E-06) — Scanner-hardening impact proof.
 *
 * READ-ONLY measurement: runs the hardened SecurityScanner over every v4 schema in the
 * sibling `flowmcp-schemas-private` repo and verifies that ONLY true violations are flagged
 * while the measured false-positive classes pass. No schema file is written or touched.
 *
 * Run manually (not part of `npm test` — depends on the private schemas repo being present):
 *   node tests/manual/scanner-impact-scan.mjs
 *
 * Exit 0 = expectation held, exit 1 = an unexpected file was flagged or an FP sample failed.
 *
 * Finding (2026-07-12, hardened scanner): 11 schemas carry REAL forbidden patterns —
 *   SEC001 import (static): geo/geo.mjs, inkar/inkar.mjs
 *   SEC001 import (DYNAMIC import() — the 148 A' false negative the old scanner MISSED):
 *           podcastindex/podcastIndex.mjs, indicators/chart-generator.mjs,
 *           kultureinrichtungenberlin/kultureinrichtungenberlin.mjs
 *   SEC006 process.env.HOME (SQLite handlers, real process access — r5 mislabeled these as FP):
 *           chainregistry, geo/geostation, ofacsdn, offeneregister, pools, tokens
 * All are true positives. The pre-hardening scanner flagged 30 (mostly URL/comment/setTimeout
 * false positives) AND missed the 10 dynamic-import sites. These 11 are trusted schemaFolders[]
 * schemas loaded with skipScan:true — they never traverse the private gate; the scan is a
 * measurement of scanner precision, not a rejection of the trusted catalog.
 */

import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SecurityScanner } from '../../src/v4/task/SecurityScanner.mjs'

const __dirname = dirname( fileURLToPath( import.meta.url ) )
const providersDir = join( __dirname, '..', '..', '..', 'flowmcp-schemas-private', 'schemas', 'v4.0.0', 'providers' )

const expectedTruePositives = [
    'geo/geo.mjs',
    'inkar/inkar.mjs',
    'podcastindex/podcastIndex.mjs',
    'indicators/chart-generator.mjs',
    'kultureinrichtungenberlin/kultureinrichtungenberlin.mjs',
    'chainregistry/chainregistry.mjs',
    'geo/geostation.mjs',
    'ofacsdn/ofacsdn.mjs',
    'offeneregister/offeneregister.mjs',
    'pools/pools.mjs',
    'tokens/tokens.mjs'
]

const falsePositiveSamples = [
    'ethers/abi-utils.mjs',
    'dottescooter/dottEscooter.mjs',
    'bfsodl/bfsodl.mjs',
    'taapi/indicators-part1.mjs'
]


const walk = ( dir ) => {
    const entries = readdirSync( dir )

    return entries
        .flatMap( ( entry ) => {
            const full = join( dir, entry )
            const st = statSync( full )

            if( st.isDirectory() ) {
                if( entry === '_shared' || entry === '_lists' ) { return [] }

                return walk( full )
            }

            if( entry.endsWith( '.mjs' ) ) { return [ full ] }

            return []
        } )
}


const main = async () => {
    if( existsSync( providersDir ) === false ) {
        console.log( `SKIP: schemas repo not found at ${providersDir} — check out flowmcp-schemas-private to run this proof.` )
        process.exit( 0 )
    }

    const files = walk( providersDir )

    const results = await Promise.all(
        files
            .map( async ( f ) => {
                const { status, messages } = await SecurityScanner.scan( { filePath: f } )
                const rel = f.replace( providersDir + '/', '' )

                return { rel, status, messages }
            } )
    )

    const flagged = results.filter( ( r ) => r.status === false )

    console.log( '=== Scanner-hardening impact proof (Memo 152 / PRD-022, E-06) ===' )
    console.log( `total schemas scanned : ${files.length}` )
    console.log( `flagged (real)        : ${flagged.length}` )
    console.log( '' )

    flagged
        .forEach( ( r ) => {
            const codes = r.messages
                .map( ( m ) => m.split( ' ' )[ 0 ] )
            const uniqueCodes = Array.from( new Set( codes ) ).join( ',' )
            console.log( `  FLAG ${r.rel} [${uniqueCodes}]` )
        } )

    console.log( '' )

    // Verdict 1 — every flagged file must be an expected true positive (no false positive)
    const unexpectedFlags = flagged
        .filter( ( r ) => expectedTruePositives.includes( r.rel ) === false )
        .map( ( r ) => r.rel )

    // Verdict 2 — the 4 verbatim false-positive samples must PASS (not be flagged)
    const flaggedFpSamples = falsePositiveSamples
        .filter( ( sample ) => flagged.some( ( r ) => r.rel === sample ) )

    // Verdict 3 — geo + inkar (the canonical top-level imports) must be flagged
    const missingImports = [ 'geo/geo.mjs', 'inkar/inkar.mjs' ]
        .filter( ( rel ) => flagged.some( ( r ) => r.rel === rel ) === false )

    const problems = []
    if( unexpectedFlags.length > 0 ) { problems.push( `unexpected false positives: ${unexpectedFlags.join( ', ' )}` ) }
    if( flaggedFpSamples.length > 0 ) { problems.push( `FP samples wrongly flagged: ${flaggedFpSamples.join( ', ' )}` ) }
    if( missingImports.length > 0 ) { problems.push( `canonical imports NOT flagged: ${missingImports.join( ', ' )}` ) }

    if( problems.length > 0 ) {
        console.log( 'RESULT: FAIL' )
        problems.forEach( ( p ) => console.log( `  - ${p}` ) )
        process.exit( 1 )
    }

    console.log( 'RESULT: PASS — flagged set == known true positives; all 4 FP samples passed; geo + inkar flagged.' )
    process.exit( 0 )
}


main()
