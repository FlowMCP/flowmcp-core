/**
 * FlowMCP — MIT License
 *
 * DISCLAIMER: This code orchestrates calls to third-party APIs. Each API has
 * its own Terms of Services. FlowMCP makes no representation about TOS
 * compliance, data licensing, or fitness for any purpose. Users are solely
 * responsible for reviewing and adhering to each API provider's terms.
 *
 * For more information, see LICENSE.md and DISCLAIMER.md in the repo root.
 */

import { pathToFileURL } from 'node:url'


class SchemaLoader {
    static async load( { filePath } ) {
        const fileUrl = pathToFileURL( filePath ).href
        const module = await import( fileUrl )
        const main = module['main'] || null
        const handlersFn = module['handlers'] || null
        const schema = module['schema'] || null
        const hasHandlers = typeof handlersFn === 'function'

        if( main === null && schema === null ) {
            return {
                main,
                handlersFn,
                schema,
                hasHandlers,
                module,
                messages: [ 'SchemaLoader: Module has neither "main" nor "schema" export — cannot load' ],
                detectedVersion: 'unknown'
            }
        }

        const { messages, detectedVersion } = SchemaLoader
            .#resolveToolsAlias( { main } )

        return { main, handlersFn, schema, hasHandlers, module, messages, detectedVersion }
    }


    static #resolveToolsAlias( { main } ) {
        const messages = []
        let detectedVersion = 'unknown'

        if( main === null ) {
            return { messages, detectedVersion }
        }

        const hasTools = main[ 'tools' ] !== undefined
        const hasRoutes = main[ 'routes' ] !== undefined

        if( hasTools && hasRoutes ) {
            messages.push( 'main: Schema has both "tools" and "routes" — ambiguous, remove one' )

            return { messages, detectedVersion }
        }

        if( hasTools ) {
            detectedVersion = 'v3'

            return { messages, detectedVersion }
        }

        if( hasRoutes ) {
            main[ 'tools' ] = main[ 'routes' ]
            detectedVersion = 'v2'
            messages.push( 'main.routes: Deprecated — use "tools" instead (auto-aliased)' )

            return { messages, detectedVersion }
        }

        return { messages, detectedVersion }
    }
}


export { SchemaLoader }
