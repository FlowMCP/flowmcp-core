import { describe, test, expect } from '@jest/globals'
import { ResourceMarkdownLoader } from '../../src/v2/task/ResourceMarkdownLoader.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'


const testDir = join( tmpdir(), 'flowmcp-test-markdown-loader' )
const testFilePath = join( testDir, 'test-doc.md' )

const sampleMarkdown = `# Main Title

Introduction paragraph.

## Functions

Here are some functions:

- \`add(a, b)\` — adds two numbers
- \`subtract(a, b)\` — subtracts b from a

### Sub-heading under Functions

More details about functions.

## Data Types

Available data types:

| Type | Description |
|------|-------------|
| string | Text value |
| number | Numeric value |

## Examples

Some example code here.

### Example 1

First example details.

### Example 2

Second example details.
`

mkdirSync( testDir, { recursive: true } )
writeFileSync( testFilePath, sampleMarkdown, 'utf-8' )


describe( 'ResourceMarkdownLoader', () => {
    describe( 'load()', () => {
        test( 'loads a markdown file and returns content', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            expect( typeof content ).toBe( 'string' )
            expect( content ).toContain( '# Main Title' )
            expect( content ).toContain( '## Functions' )
        } )


        test( 'throws when file does not exist', () => {
            expect( () => {
                ResourceMarkdownLoader
                    .load( { filePath: '/nonexistent/file.md' } )
            } ).toThrow()
        } )
    } )


    describe( 'getSection()', () => {
        test( 'extracts a section by heading name', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { result } = ResourceMarkdownLoader
                .getSection( { content, section: '## Functions' } )

            expect( result ).toContain( '## Functions' )
            expect( result ).toContain( 'add(a, b)' )
            expect( result ).toContain( 'Sub-heading under Functions' )
            expect( result ).not.toContain( '## Data Types' )
        } )


        test( 'extracts section without ## prefix', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { result } = ResourceMarkdownLoader
                .getSection( { content, section: 'Functions' } )

            expect( result ).toContain( '## Functions' )
            expect( result ).toContain( 'add(a, b)' )
        } )


        test( 'returns null when section not found', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { result } = ResourceMarkdownLoader
                .getSection( { content, section: 'Nonexistent' } )

            expect( result ).toBeNull()
        } )


        test( 'includes sub-headings within section', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { result } = ResourceMarkdownLoader
                .getSection( { content, section: '## Examples' } )

            expect( result ).toContain( '## Examples' )
            expect( result ).toContain( '### Example 1' )
            expect( result ).toContain( '### Example 2' )
        } )


        test( 'stops at next heading of same or higher level', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { result } = ResourceMarkdownLoader
                .getSection( { content, section: '## Data Types' } )

            expect( result ).toContain( '## Data Types' )
            expect( result ).toContain( 'string' )
            expect( result ).not.toContain( '## Examples' )
        } )
    } )


    describe( 'getLines()', () => {
        test( 'extracts a range of lines', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { result } = ResourceMarkdownLoader
                .getLines( { content, from: 1, to: 3 } )

            const lines = result.split( '\n' )

            expect( lines[0] ).toBe( '# Main Title' )
            expect( lines.length ).toBe( 3 )
        } )


        test( 'handles from=1 correctly (1-based indexing)', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { result } = ResourceMarkdownLoader
                .getLines( { content, from: 1, to: 1 } )

            expect( result ).toBe( '# Main Title' )
        } )


        test( 'clamps to end of file when to exceeds line count', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const lineCount = content.split( '\n' ).length
            const { result } = ResourceMarkdownLoader
                .getLines( { content, from: 1, to: lineCount + 100 } )

            expect( result ).toBe( content )
        } )
    } )


    describe( 'searchContent()', () => {
        test( 'finds matching lines with context', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { results } = ResourceMarkdownLoader
                .searchContent( { content, search: 'add(a, b)' } )

            expect( results.length ).toBeGreaterThan( 0 )
            expect( results[0]['content'] ).toContain( 'add(a, b)' )
            expect( results[0]['lines'] ).toBeDefined()
        } )


        test( 'returns empty array when no matches found', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { results } = ResourceMarkdownLoader
                .searchContent( { content, search: 'ZZZZNONEXISTENT' } )

            expect( results ).toEqual( [] )
        } )


        test( 'search is case-insensitive', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { results } = ResourceMarkdownLoader
                .searchContent( { content, search: 'FUNCTIONS' } )

            expect( results.length ).toBeGreaterThan( 0 )
        } )


        test( 'merges overlapping context ranges', () => {
            const { content } = ResourceMarkdownLoader
                .load( { filePath: testFilePath } )

            const { results } = ResourceMarkdownLoader
                .searchContent( { content, search: 'subtract' } )

            expect( results.length ).toBe( 1 )
            expect( results[0]['content'] ).toContain( 'subtract' )
        } )
    } )


    describe( 'parseLineRange()', () => {
        test( 'parses valid range', () => {
            const { from, to, error } = ResourceMarkdownLoader
                .parseLineRange( { lines: '11-33' } )

            expect( from ).toBe( 11 )
            expect( to ).toBe( 33 )
            expect( error ).toBeNull()
        } )


        test( 'returns error for invalid format', () => {
            const { from, to, error } = ResourceMarkdownLoader
                .parseLineRange( { lines: '11' } )

            expect( from ).toBeNull()
            expect( to ).toBeNull()
            expect( error ).toContain( 'from-to' )
        } )


        test( 'returns error for non-numeric values', () => {
            const { from, to, error } = ResourceMarkdownLoader
                .parseLineRange( { lines: 'abc-def' } )

            expect( from ).toBeNull()
            expect( error ).toContain( 'numeric' )
        } )


        test( 'returns error when from is less than 1', () => {
            const { error } = ResourceMarkdownLoader
                .parseLineRange( { lines: '0-10' } )

            expect( error ).toContain( '>= 1' )
        } )


        test( 'returns error when to is less than from', () => {
            const { error } = ResourceMarkdownLoader
                .parseLineRange( { lines: '10-5' } )

            expect( error ).toContain( '>= "from"' )
        } )
    } )
} )
