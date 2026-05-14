export class SelectionLoader {

    static async load( { filePath } ) {
        const module = await import( filePath )

        if( module.selection === undefined ) {
            throw new Error( `SelectionLoader: No 'selection' export found in '${filePath}'` )
        }

        return { selection: module.selection }
    }

}
