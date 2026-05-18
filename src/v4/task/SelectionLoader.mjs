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

export class SelectionLoader {

    static async load( { filePath } ) {
        const module = await import( filePath )

        if( module.selection === undefined ) {
            throw new Error( `SelectionLoader: No 'selection' export found in '${filePath}'` )
        }

        return { selection: module.selection }
    }

}
