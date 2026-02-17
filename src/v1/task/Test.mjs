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