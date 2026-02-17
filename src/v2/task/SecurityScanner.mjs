import { readFile } from 'node:fs/promises'


class SecurityScanner {
    static async scan( { filePath } ) {
        const content = await readFile( filePath, 'utf-8' )
        const { status, messages } = SecurityScanner
            .#scanContent( { content, filePath } )

        return { status, messages }
    }


    static scanString( { content, filePath = '<string>' } ) {
        const { status, messages } = SecurityScanner
            .#scanContent( { content, filePath } )

        return { status, messages }
    }


    static #scanContent( { content, filePath } ) {
        const messages = []
        const forbiddenPatterns = SecurityScanner.#getForbiddenPatterns()
        const lines = content.split( '\n' )

        lines
            .forEach( ( line, index ) => {
                const lineNumber = index + 1
                const trimmed = line.trim()

                if( trimmed.startsWith( '//' ) || trimmed.startsWith( '*' ) || trimmed.startsWith( '/*' ) ) {
                    return
                }

                forbiddenPatterns
                    .forEach( ( [ pattern, code, label ] ) => {
                        if( line.includes( pattern ) ) {
                            messages.push( `${code} ${filePath}: Forbidden pattern "${label}" found at line ${lineNumber}` )
                        }
                    } )
            } )

        const status = messages.length === 0

        return { status, messages }
    }


    static #getForbiddenPatterns() {
        const patterns = [
            [ 'import ',        'SEC001', 'import' ],
            [ 'require(',       'SEC002', 'require' ],
            [ 'eval(',          'SEC003', 'eval' ],
            [ 'Function(',      'SEC004', 'Function constructor' ],
            [ 'new Function',   'SEC005', 'new Function' ],
            [ 'process.',       'SEC006', 'process access' ],
            [ 'child_process',  'SEC007', 'child_process' ],
            [ 'fs.',            'SEC008', 'filesystem access' ],
            [ 'node:fs',        'SEC009', 'node:fs' ],
            [ 'fs/promises',    'SEC010', 'fs/promises' ],
            [ 'globalThis.',    'SEC011', 'globalThis' ],
            [ 'global.',        'SEC012', 'global scope' ],
            [ '__dirname',      'SEC013', '__dirname' ],
            [ '__filename',     'SEC014', '__filename' ],
            [ 'setTimeout',     'SEC015', 'setTimeout' ],
            [ 'setInterval',    'SEC016', 'setInterval' ]
        ]

        return patterns
    }
}


export { SecurityScanner }
