class Test {
    static all( { schema } ) {
        const { routes } = schema
        const results = Object
            .entries( routes )
            .reduce( ( acc, route ) => {
                const [ name, routeData ] = route
                const { tests } = routeData
                tests
                    .forEach( ( test ) => {
                        acc.push( [ name, test ] )
                    } )

                return acc
            }, [] )

        return results
    }
}


export { Test }