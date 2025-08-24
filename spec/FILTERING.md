# FlowMCP Schema Filtering Specification

## Overview

The `FlowMCP.filterArrayOfSchemas()` method provides a comprehensive filtering system for MCP schemas with three parameter types and fail-fast error handling. **Invalid activateTags will cause the method to throw errors immediately** instead of processing with warnings.

## Parameters

### `arrayOfSchemas` (Array, Required)
- Array of schema objects to be filtered
- Must contain at least one schema object
- **Error if empty:** Immediate validation error

### `includeNamespaces` (Array, Optional)
- Whitelist of namespace strings to include
- **Priority:** Takes precedence over `excludeNamespaces` 
- **Empty array:** No namespace filtering applied
- **Case-insensitive matching**

### `excludeNamespaces` (Array, Optional) 
- Blacklist of namespace strings to exclude
- **Only active when `includeNamespaces` is empty**
- **Empty array:** No namespace filtering applied
- **Case-insensitive matching**

### `activateTags` (Array, Optional)
- Mixed array supporting two syntax types:
  1. **Schema Tags:** `"tagName"` - filters schemas by their tags array (validated against available tags)
  2. **Route Filters:** `"namespace.routeName"` or `"namespace.!routeName"` (validated against available routes)
- **Empty array:** No tag/route filtering applied
- **Case-insensitive matching**
- **Validation:** All tags and routes are validated upfront - invalid entries cause immediate error

## Filter Pipeline

The filtering process follows a strict 4-step pipeline with upfront validation:

### Step 0: Tag & Route Validation (ArrayOfSchemasFilter)
```javascript
// All activateTags are validated before any filtering begins
// Uses ArrayOfSchemasFilter.validateTags() method
const { validatedTags, validatedRoutes } = ArrayOfSchemasFilter
    .validateTags( { arrayOfSchemas, activateTags } )

// If any validation fails, method throws Error with all issues:
// "Invalid activateTags found:
// - Tag 'nonExistentTag' not found in any schema
// - Route 'invalidroute' not found in namespace 'validNamespace'"
```

### Step 1: Namespace Filtering (ArrayOfSchemasFilter)
```javascript
// Priority logic
if( includeNamespaces.length > 0 ) {
    // Only include schemas with matching namespaces
    return includeNamespaces.includes( schema.namespace.toLowerCase() )
} else if( excludeNamespaces.length > 0 ) {
    // Exclude schemas with matching namespaces  
    return !excludeNamespaces.includes( schema.namespace.toLowerCase() )
} else {
    // No namespace filtering
    return true
}
```

### Step 2: Tag & Route Filtering (ArrayOfSchemasFilter)
```javascript
// Uses pre-validated tags and routes from Step 0
const { filteredArrayOfSchemas } = ArrayOfSchemasFilter
    .filterByTagsAndRoutes( { 
        arrayOfSchemas: filteredByNamespaces, 
        validatedTags,          // Already validated simple tags
        validatedRoutes,        // Already validated namespace.route patterns
        originalActivateTagsCount: activateTags.length
    } )

// Tag filtering logic (OR logic):
if( validatedTags.length > 0 ) {
    return schema.tags.some( tag => 
        validatedTags.includes( tag.toLowerCase() ) 
    )
}

// Route filtering logic:
if( Object.keys( validatedRoutes ).length > 0 ) {
    // Apply include/exclude route logic per namespace
    return applyRouteFilters( schema, validatedRoutes )
}
```

### Step 3: Empty Schema Cleanup
- Remove schemas with empty routes (after filtering)
- Return final filtered array
- **No error collection** - all errors thrown in Step 0

## activateTags Syntax

### Schema Tag Syntax
```javascript
// Single word without dots
"blockchain"     // Include schemas with tag "blockchain"
"dataProvider"   // Include schemas with tag "dataProvider"  
"DEFI"          // Include schemas with tag "defi" (case-insensitive)
```

### Route Filter Syntax
```javascript
// Include specific routes
"namespace.routeName"        // Include only this route from namespace
"luksoNetwork.getBlocks"     // Include only getBlocks from luksoNetwork

// Exclude specific routes  
"namespace.!routeName"       // Exclude this route from namespace
"luksoNetwork.!getBlocks"    // Exclude getBlocks from luksoNetwork

// Multiple routes per namespace
[
    "luksoNetwork.getBlocks",
    "luksoNetwork.getBalance", 
    "luksoNetwork.!getTransactions"  // Exclude takes priority
]
```

## Route Filter Logic

### Include vs Exclude Priority
1. **Exclude routes (!) always take priority**
2. **If any include routes specified:** Only included routes are kept
3. **If only exclude routes specified:** All routes except excluded are kept

### Example Route Filtering
```javascript
// Input schema routes: ["getBlocks", "getBalance", "getTransactions"]
// activateTags: ["namespace.getBlocks", "namespace.!getBlocks"]
// Result: [] (exclude takes priority, schema filtered out)

// Input schema routes: ["getBlocks", "getBalance", "getTransactions"] 
// activateTags: ["namespace.getBlocks", "namespace.getBalance"]
// Result: ["getBlocks", "getBalance"] (only included routes)

// Input schema routes: ["getBlocks", "getBalance", "getTransactions"]
// activateTags: ["namespace.!getTransactions"] 
// Result: ["getBlocks", "getBalance"] (all except excluded)
```

## Error Handling Strategy

### Fail-Fast Error Throwing
**All errors are validated upfront and cause immediate method failure with comprehensive error messages**

### Error Categories

#### 1. Invalid activateTags Syntax
```javascript
// Detected in ArrayOfSchemasFilter.validateTags()
"Invalid activateTags syntax: 'invalid.tag.too.many.dots'"
"Invalid activateTags syntax: '.emptyNamespace'"
"Invalid activateTags syntax: 'namespace.'"
```

#### 2. Non-Existent Schema Tags
```javascript
// Detected during tag validation
"Tag 'nonExistentTag' not found in any schema"
"Tag 'invalidBlockchain' not found in any schema"
```

#### 3. Non-Existent Namespaces in Routes
```javascript
// Detected during route validation
"Namespace 'unknownNamespace' not found in schemas"
"Namespace 'invalidApi' not found in schemas"
```

#### 4. Non-Existent Routes in Valid Namespaces
```javascript
// Detected during route validation  
"Route 'unknownroute' not found in namespace 'validNamespace'"
"Route 'invalidmethod' not found in namespace 'luksoNetwork'"
```

### Error Message Format
```javascript
// All errors collected and thrown together
if( errors.length > 0 ) {
    const uniqueErrors = [ ...new Set( errors ) ]
    const errorMessage = `Invalid activateTags found:\n${uniqueErrors.map( err => `- ${err}` ).join( '\n' )}`
    throw new Error( errorMessage )
}
```

### Error Behavior
- **No partial results:** Method fails completely on any invalid activateTag
- **Comprehensive reporting:** All validation errors included in single error message  
- **No warnings:** Method either succeeds completely or fails with error

## Complete Examples

### Example 1: Namespace + Tag Filtering
```javascript
const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
    arrayOfSchemas: schemas,
    includeNamespaces: [ 'luksoNetwork', 'ethereum' ],
    excludeNamespaces: [], // ignored due to includeNamespaces
    activateTags: [ 'blockchain' ]
} )
// Result: Only luksoNetwork + ethereum schemas that have 'blockchain' tag
```

### Example 2: Route-Level Include/Exclude
```javascript
const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
    arrayOfSchemas: schemas,
    includeNamespaces: [],
    excludeNamespaces: [ 'testNamespace' ],
    activateTags: [ 
        'luksoNetwork.getBlocks',
        'luksoNetwork.getBalance',
        'luksoNetwork.!getTransactions',
        'ethereum.!transfer'
    ]
} )
// Result: 
// - All schemas except 'testNamespace'
// - luksoNetwork: only getBlocks + getBalance (getTransactions excluded)
// - ethereum: all routes except transfer
```

### Example 3: Error Handling with Invalid Tags
```javascript
try {
    const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
        arrayOfSchemas: schemas,
        includeNamespaces: [],
        excludeNamespaces: [],
        activateTags: [ 
            'blockchain',                           // Valid schema tag
            'unknownNamespace.getBlocks',          // Error: namespace not found
            'luksoNetwork.unknownRoute',           // Error: route not found
            'invalid.tag.too.many.dots',           // Error: invalid syntax
            'luksoNetwork.!getTransactions'        // Valid route exclude
        ]
    } )
} catch( error ) {
    console.log( error.message )
    // "Invalid activateTags found:
    // - Invalid activateTags syntax: 'invalid.tag.too.many.dots'
    // - Namespace 'unknownNamespace' not found in schemas  
    // - Route 'unknownroute' not found in namespace 'luksoNetwork'"
}
// Result: Method throws error, no partial filtering performed
```

## Case-Insensitive Behavior

All string comparisons are performed in lowercase:
```javascript
// These are equivalent:
"BLOCKCHAIN" === "blockchain" === "BlockChain"
"LuksoNetwork.GetBlocks" === "luksonetwork.getblocks"
"NAMESPACE.!ROUTE" === "namespace.!route"
```

## Implementation Notes

### Architecture
- Core filtering logic delegated to `ArrayOfSchemasFilter` class
- Two-phase architecture: upfront validation + clean filtering
- Fail-fast error handling prevents partial results

### Performance Considerations
- Pre-validation with Set-based lookups for O(1) tag/route checking
- Filtering is performed in-memory with O(n) complexity per step
- Large schema arrays (1000+ schemas) should complete within 1 second  
- Route filtering creates new schema objects (immutable approach)

### Validation Requirements  
- Comprehensive upfront validation via `ArrayOfSchemasFilter.validateTags()`
- Parameter type checking (arrays, strings) via `Validation.filterArrayOfSchemas()`
- All activateTags validated against available tags and routes before processing

### Return Value
```javascript
{
    filteredArrayOfSchemas: Array // Filtered schema objects
}
```

---

## Test Coverage Requirements

This specification requires comprehensive test coverage for:
- ✅ Basic namespace filtering (include/exclude)
- ✅ Schema tag filtering (single/multiple tags)  
- ✅ Route-level filtering (include/exclude/mixed)
- ✅ Error collection and reporting
- ✅ Case-insensitive matching
- ✅ Edge cases and malformed input
- ✅ Performance with large datasets
- ✅ Complex filter combinations