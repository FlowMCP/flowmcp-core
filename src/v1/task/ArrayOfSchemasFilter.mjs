class ArrayOfSchemasFilter {

    static validateTags( { arrayOfSchemas, activateTags } ) {
        const errors = []
        const validatedTags = []
        const validatedRoutes = {}
        
        // Collect all available tags and routes
        const availableTagsSet = new Set()
        const availableRoutesMap = {}
        
        arrayOfSchemas
            .forEach( schema => {
                const { namespace, tags, routes } = schema
                const namespaceKey = namespace.toLowerCase()
                
                // Collect tags
                tags.forEach( tag => availableTagsSet.add( tag.toLowerCase() ) )
                
                // Collect routes
                if( !availableRoutesMap[ namespaceKey ] ) {
                    availableRoutesMap[ namespaceKey ] = new Set()
                }
                
                Object
                    .keys( routes )
                    .forEach( routeName => {
                        availableRoutesMap[ namespaceKey ].add( routeName.toLowerCase() )
                    } )
            } )
        
        // Validate each activateTag
        activateTags
            .forEach( tag => {
                if( typeof tag !== 'string' || tag.trim() === '' ) {
                    errors.push( `Invalid activateTags syntax: '${tag}'` )
                    return
                }
                
                const trimmedTag = tag.trim()
                
                if( !trimmedTag.includes( '.' ) ) {
                    // Simple tag filter - validate against available tags
                    const tagLower = trimmedTag.toLowerCase()
                    if( !availableTagsSet.has( tagLower ) ) {
                        errors.push( `Tag '${trimmedTag}' not found in any schema` )
                        return
                    }
                    validatedTags.push( tagLower )
                } else {
                    // Route filter - validate namespace.route format
                    const parts = trimmedTag.split( '.' )
                    if( parts.length !== 2 || parts[0] === '' || parts[1] === '' ) {
                        errors.push( `Invalid activateTags syntax: '${trimmedTag}'` )
                        return
                    }
                    
                    const [ namespace, routeNameCmd ] = parts
                    const namespaceKey = namespace.toLowerCase()
                    const isExclude = routeNameCmd.startsWith( '!' )
                    const routeName = isExclude ? routeNameCmd.substring( 1 ).toLowerCase() : routeNameCmd.toLowerCase()
                    
                    // Check if namespace exists
                    if( !availableRoutesMap[ namespaceKey ] ) {
                        errors.push( `Namespace '${namespace}' not found in schemas` )
                        return
                    }
                    
                    // Check if route exists in namespace
                    if( !availableRoutesMap[ namespaceKey ].has( routeName ) ) {
                        errors.push( `Route '${routeName}' not found in namespace '${namespace}'` )
                        return
                    }
                    
                    // Route is valid, add it to filters
                    if( !validatedRoutes[ namespaceKey ] ) {
                        validatedRoutes[ namespaceKey ] = []
                    }
                    validatedRoutes[ namespaceKey ].push( isExclude ? `!${routeName}` : routeName )
                }
            } )
        
        // If validation errors found, throw error with all issues
        if( errors.length > 0 ) {
            const uniqueErrors = [ ...new Set( errors ) ]
            const errorMessage = `Invalid activateTags found:\n${uniqueErrors.map( err => `- ${err}` ).join( '\n' )}`
            throw new Error( errorMessage )
        }
        
        return { validatedTags, validatedRoutes }
    }


    static filterByNamespaces( { arrayOfSchemas, includeNamespaces, excludeNamespaces } ) {
        const filteredByNamespaces = arrayOfSchemas
            .filter( schema => {
                const { namespace } = schema
                
                if( includeNamespaces.length > 0 ) {
                    return includeNamespaces
                        .some( includeNs => includeNs.toLowerCase() === namespace.toLowerCase() )
                } else if( excludeNamespaces.length > 0 ) {
                    return !excludeNamespaces
                        .some( excludeNs => excludeNs.toLowerCase() === namespace.toLowerCase() )
                } else {
                    return true
                }
            } )
        
        return { filteredByNamespaces }
    }


    static filterByTagsAndRoutes( { arrayOfSchemas, validatedTags, validatedRoutes, originalActivateTagsCount } ) {
        const filteredSchemas = arrayOfSchemas
            .filter( schema => {
                const { tags } = schema
                const namespaceKey = schema.namespace.toLowerCase()
                
                // If no VALID filters after validation, behavior depends on whether any tags were originally specified
                if( validatedTags.length === 0 && Object.keys( validatedRoutes ).length === 0 ) {
                    // If no activateTags were originally specified, keep all schemas
                    // If activateTags were specified but all were invalid, return no schemas
                    return originalActivateTagsCount === 0
                }
                
                // If only route filters (no tag filters), only keep schemas with route filters
                if( validatedTags.length === 0 && Object.keys( validatedRoutes ).length > 0 ) {
                    return Object.hasOwn( validatedRoutes, namespaceKey )
                }
                
                // If only tag filters (no route filters), filter by tags
                if( validatedTags.length > 0 && Object.keys( validatedRoutes ).length === 0 ) {
                    return validatedTags
                        .some( filterTag => 
                            tags.some( schemaTag => schemaTag.toLowerCase() === filterTag )
                        )
                }
                
                // If both tag and route filters, use OR logic
                const hasMatchingTag = validatedTags
                    .some( filterTag => 
                        tags.some( schemaTag => schemaTag.toLowerCase() === filterTag )
                    )
                
                const hasRouteFilter = Object.hasOwn( validatedRoutes, namespaceKey )
                
                return hasMatchingTag || hasRouteFilter
            } )
            .map( schema => {
                const { namespace } = schema
                const newSchema = { ...schema }
                
                if( Object.keys( validatedRoutes ).length === 0 ) { 
                    return newSchema 
                }
                
                const namespaceKey = namespace.toLowerCase()
                
                // If no route filters for this namespace, keep all routes
                if( !Object.hasOwn( validatedRoutes, namespaceKey ) ) {
                    return newSchema
                }
                
                const routeFilters = validatedRoutes[ namespaceKey ]
                const hasIncludeRoutes = routeFilters
                    .some( routeCmd => !routeCmd.startsWith( '!' ) )
                
                // Apply route filtering
                newSchema['routes'] = Object
                    .entries( schema['routes'] )
                    .filter( ( [ routeName ] ) => {
                        const routeNameLower = routeName.toLowerCase()
                        
                        // Exclude routes with '!' prefix (exclude takes priority)
                        const excludeTag = `!${routeNameLower}`
                        if( routeFilters.includes( excludeTag ) ) { 
                            return false 
                        }
                        
                        if( hasIncludeRoutes ) {
                            // If include routes specified, only keep included ones
                            return routeFilters.includes( routeNameLower )
                        } else { 
                            return true 
                        }
                    } )
                    .reduce( ( acc, [ routeName, route ] ) => {
                        acc[ routeName ] = route
                        return acc
                    }, {} )
                
                return newSchema
            } )
            .filter( schema => {
                // Remove schemas with no routes after filtering
                return Object.keys( schema.routes ).length > 0
            } )
        
        return { filteredArrayOfSchemas: filteredSchemas }
    }
}


export { ArrayOfSchemasFilter }