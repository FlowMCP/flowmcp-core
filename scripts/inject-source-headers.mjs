import { readFile, writeFile, readdir, stat, rename } from 'node:fs/promises'
import { join, resolve } from 'node:path'


const MARKER = 'FlowMCP — MIT License'

const HEADER = `/**
 * FlowMCP — MIT License
 *
 * DISCLAIMER: This code orchestrates calls to third-party APIs. Each API has
 * its own Terms of Services. FlowMCP makes no representation about TOS
 * compliance, data licensing, or fitness for any purpose. Users are solely
 * responsible for reviewing and adhering to each API provider's terms.
 *
 * For more information, see LICENSE.md and DISCLAIMER.md in the repo root.
 */

`


const EXCLUDE = new Set( [ 'node_modules', 'coverage', '.git', 'tests', '.trash' ] )


const findMjsFiles = async ( { dir } ) => {
    const entries = await readdir( dir, { withFileTypes: true } )
    const files = []
    for( const entry of entries ) {
        if( EXCLUDE.has( entry.name ) ) { continue }
        const fullPath = join( dir, entry.name )
        if( entry.isDirectory() ) {
            const nested = await findMjsFiles( { dir: fullPath } )
            files.push( ...nested )
        } else if( entry.isFile() && entry.name.endsWith( '.mjs' ) ) {
            files.push( fullPath )
        }
    }
    return files
}


const injectHeader = async ( { file } ) => {
    const content = await readFile( file, 'utf-8' )
    if( content.includes( MARKER ) ) {
        return { file, status: 'skipped' }
    }
    const newContent = HEADER + content
    const tmp = `${file}.tmp`
    await writeFile( tmp, newContent, 'utf-8' )
    await rename( tmp, file )
    return { file, status: 'injected' }
}


const main = async () => {
    const root = resolve( process.cwd(), 'src' )
    console.log( `Scanning ${root} for .mjs files...` )
    const files = await findMjsFiles( { dir: root } )
    console.log( `Found ${files.length} files.` )
    const results = []
    for( const file of files ) {
        const res = await injectHeader( { file } )
        results.push( res )
    }
    const injected = results.filter( ( r ) => r.status === 'injected' ).length
    const skipped = results.filter( ( r ) => r.status === 'skipped' ).length
    console.log( `Injected: ${injected}` )
    console.log( `Skipped (already has header): ${skipped}` )
    console.log( `Total: ${results.length}` )
}


main()
    .then( () => process.exit( 0 ) )
    .catch( ( err ) => {
        console.error( 'Error:', err )
        process.exit( 1 )
    } )
