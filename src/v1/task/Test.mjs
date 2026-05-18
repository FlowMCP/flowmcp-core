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

class Test {
    static all( { schema } ) {
        const { routes } = schema
        const results = Object
            .entries( routes )
            .reduce( ( acc, [ routeName, value ] ) => {
                const { tests } = value
                tests
                    .forEach( ( obj ) => {
                        const { description, userParams } = Object
                            .entries( obj )
                            .reduce( ( abb, [ key, value ] ) => {
                                if( key === '_description' ) {
                                    abb['description'] = value
                                } else if( !key.startsWith( '_' ) ) {
                                    abb['userParams'][ key ] = value
                                }

                                return abb
                            }, { 'description': '', 'userParams': {} } )

                        const payload = { routeName, description, userParams }
                        acc.push( payload )

                        return true
                    } )

                return acc
            }, [] )

        return results
    }
}


export { Test }