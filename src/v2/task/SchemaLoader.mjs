import { pathToFileURL } from 'node:url'


class SchemaLoader {
    static async load( { filePath } ) {
        const fileUrl = pathToFileURL( filePath ).href
        const module = await import( fileUrl )
        const main = module['main'] || null
        const handlersFn = module['handlers'] || null
        const schema = module['schema'] || null
        const hasHandlers = typeof handlersFn === 'function'

        return { main, handlersFn, schema, hasHandlers, module }
    }
}


export { SchemaLoader }
