import { readFileSync } from 'node:fs'


class ResourceMarkdownLoader {
    static #CONTEXT_LINES = 2


    static load( { filePath } ) {
        const content = readFileSync( filePath, 'utf-8' )

        return { content }
    }


    static getSection( { content, section } ) {
        const lines = content.split( '\n' )
        const sectionTrimmed = section.replace( /^#+\s*/, '' ).trim()

        let startIndex = -1
        let sectionLevel = 0

        lines
            .forEach( ( line, index ) => {
                if( startIndex !== -1 ) {
                    return
                }

                const headingMatch = line.match( /^(#{1,6})\s+(.*)/ )

                if( !headingMatch ) {
                    return
                }

                const level = headingMatch[1].length
                const title = headingMatch[2].trim()

                if( title === sectionTrimmed ) {
                    startIndex = index
                    sectionLevel = level
                }
            } )

        if( startIndex === -1 ) {
            return { result: null }
        }

        let endIndex = lines.length
        const remaining = lines.slice( startIndex + 1 )

        remaining
            .forEach( ( line, offset ) => {
                if( endIndex !== lines.length ) {
                    return
                }

                const headingMatch = line.match( /^(#{1,6})\s+/ )

                if( !headingMatch ) {
                    return
                }

                const level = headingMatch[1].length

                if( level <= sectionLevel ) {
                    endIndex = startIndex + 1 + offset
                }
            } )

        const result = lines.slice( startIndex, endIndex ).join( '\n' ).trimEnd()

        return { result }
    }


    static getLines( { content, from, to } ) {
        const lines = content.split( '\n' )
        const start = Math.max( from - 1, 0 )
        const end = Math.min( to, lines.length )
        const result = lines.slice( start, end ).join( '\n' )

        return { result }
    }


    static searchContent( { content, search } ) {
        const lines = content.split( '\n' )
        const searchLower = search.toLowerCase()
        const contextLines = ResourceMarkdownLoader.#CONTEXT_LINES
        const matchedRanges = []

        lines
            .forEach( ( line, index ) => {
                if( !line.toLowerCase().includes( searchLower ) ) {
                    return
                }

                const from = Math.max( index - contextLines, 0 )
                const to = Math.min( index + contextLines, lines.length - 1 )

                matchedRanges.push( { from, to, matchLine: index } )
            } )

        const merged = ResourceMarkdownLoader.#mergeRanges( { ranges: matchedRanges } )

        const results = merged
            .map( ( range ) => {
                const snippet = lines.slice( range['from'], range['to'] + 1 ).join( '\n' )

                return {
                    lines: `${range['from'] + 1}-${range['to'] + 1}`,
                    content: snippet
                }
            } )

        return { results }
    }


    static parseLineRange( { lines } ) {
        const parts = lines.split( '-' )

        if( parts.length !== 2 ) {
            return { from: null, to: null, error: 'lines must be in format "from-to" (e.g. "11-33")' }
        }

        const from = parseInt( parts[0], 10 )
        const to = parseInt( parts[1], 10 )

        if( isNaN( from ) || isNaN( to ) ) {
            return { from: null, to: null, error: 'lines must contain numeric values (e.g. "11-33")' }
        }

        if( from < 1 ) {
            return { from: null, to: null, error: 'lines "from" must be >= 1' }
        }

        if( to < from ) {
            return { from: null, to: null, error: 'lines "to" must be >= "from"' }
        }

        return { from, to, error: null }
    }


    static #mergeRanges( { ranges } ) {
        if( ranges.length === 0 ) {
            return []
        }

        const sorted = [ ...ranges ].sort( ( a, b ) => {
            const diff = a['from'] - b['from']

            return diff
        } )

        const merged = [ { from: sorted[0]['from'], to: sorted[0]['to'] } ]

        sorted.slice( 1 )
            .forEach( ( range ) => {
                const last = merged[ merged.length - 1 ]

                if( range['from'] <= last['to'] + 1 ) {
                    last['to'] = Math.max( last['to'], range['to'] )
                } else {
                    merged.push( { from: range['from'], to: range['to'] } )
                }
            } )

        return merged
    }
}


export { ResourceMarkdownLoader }
