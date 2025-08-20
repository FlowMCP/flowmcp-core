# FlowMCP Schema Filtering Specification

## Overview

The `FlowMCP.filterArrayOfSchemas()` method provides a comprehensive filtering system for MCP schemas with three parameter types and robust error handling.

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
  1. **Schema Tags:** `"tagName"` - filters schemas by their tags array
  2. **Route Filters:** `"namespace.routeName"` or `"namespace.!routeName"`
- **Empty array:** No tag/route filtering applied
- **Case-insensitive matching**

## Filter Pipeline

The filtering process follows a strict 4-step pipeline:

### Step 1: Namespace Filtering
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

### Step 2: Schema Tag Filtering
```javascript
// Apply filterTags (activateTags without '.')
if( filterTags.length === 0 ) {
    return true // No tag filtering
} else {
    // OR logic: schema must have at least one matching tag
    return schema.tags.some( tag => 
        filterTags.includes( tag.toLowerCase() ) 
    )
}
```

### Step 3: Route-Level Filtering
```javascript
// Apply schemaFilters (activateTags with '.')
if( Object.keys( schemaFilters ).length === 0 ) {
    return schema // No route filtering
} else {
    // Only process schemas with namespace in schemaFilters
    if( !schemaFilters.hasOwnProperty( schema.namespace ) ) {
        return null // Schema filtered out
    }
    
    // Apply include/exclude route logic per namespace
    return applyRouteFilters( schema, schemaFilters[ schema.namespace ] )
}
```

### Step 4: Error Collection & Cleanup
- Remove schemas with empty routes (after filtering)
- Collect and report all accumulated errors
- Return final filtered array

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

### Collection-Based Error Reporting
**All errors are collected during processing and reported together at the end**

### Error Categories

#### 1. Empty Routes Schemas
```javascript
// Collected during Step 4
"Schema 'emptyNamespace' has no routes after filtering"
"Schema 'anotherNamespace' has no routes after filtering"
```

#### 2. Invalid activateTags Syntax
```javascript
// Collected during activateTags parsing
"Invalid activateTags syntax: 'invalid.tag.too.many.dots'"
"Invalid activateTags syntax: '.emptyNamespace'"
"Invalid activateTags syntax: 'namespace.'"
```

#### 3. Non-Existent References
```javascript
// Collected during route filtering
"Namespace 'unknownNamespace' not found in schemas"
"Route 'unknownRoute' not found in namespace 'validNamespace'"
```

### Error Message Format
```javascript
if( errors.length > 0 ) {
    const errorMessage = `
Filtering completed with warnings:
${errors.map( err => `- ${err}` ).join( '\n' )}

Filtered ${result.length} schemas successfully.`
    
    console.warn( errorMessage )
}
```

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

### Example 3: Mixed Filtering with Errors
```javascript
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
// Result: Schemas filtered + warning message with 3 collected errors
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

### Performance Considerations
- Filtering is performed in-memory with O(n) complexity per step
- Large schema arrays (1000+ schemas) should complete within 1 second
- Route filtering creates new schema objects (immutable approach)

### Validation Requirements  
- Input validation before processing begins
- Parameter type checking (arrays, strings)
- Empty array handling per specification

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