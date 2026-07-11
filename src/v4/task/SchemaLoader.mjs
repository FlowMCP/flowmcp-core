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
            .#detectShape( { main } )

        return { main, handlersFn, schema, hasHandlers, module, messages, detectedVersion }
    }


    static #detectShape( { main } ) {
        const messages = []
        let detectedVersion = 'unknown'

        if( main === null ) {
            return { messages, detectedVersion }
        }

        // v4-only: the routes->tools auto-alias is gone (Memo 152 / PRD-006, G-03).
        // A top-level `routes` key is no longer accepted here — MainValidator
        // rejects it fail-loud (VAL003 unknown field + missing tools).
        const hasTools = main[ 'tools' ] !== undefined

        if( hasTools ) {
            detectedVersion = 'v4'
        }

        return { messages, detectedVersion }
    }
}


export { SchemaLoader }
