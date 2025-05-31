import { FlowMCP } from "../../src/index.mjs";


const schemas = [
    {
        namespace: "poap",
        name: "POAP GraphQL",
        description: "GraphQL endpoint for accessing POAP event data and metadata",
        docs: ["https://public.compass.poap.tech/v1/graphql"],
        tags: ["production", "poap.getTypename"],
        flowMCP: "1.2.0",
        root: "https://public.compass.poap.tech/v1/graphql",
        requiredServerParams: [],
        headers: {
            "content-type": "application/json"
        },
        routes: {
            getTypename: {
                requestMethod: "POST",
                description: "Basic connectivity test to retrieve __typename from the POAP GraphQL endpoint",
                route: "/",
                parameters: [ { position: { key: "query", value: "query { __typename }", location: "body" }, z: { primitive: "string()", options: [] } } ],
                tests: [ { _description: "Run GraphQL __typename test" } ],
                modifiers: []
            }
        },
        handlers: {}
    },
    {
        namespace: "example",
        name: "Example API",
        description: "An example API for testing purposes",
        docs: ["https://example.com/docs"],
        tags: ["example", "test"],
        flowMCP: "1.2.0",
        root: "https://api.example.com",
        requiredServerParams: [],
        handlers: {}
    }
]

const tests = schemas
    .forEach( ( schema, index ) => {
        const { status, messages } = FlowMCP.validateSchema( { schema } )
        if( status ) { console.log( `[${index}] Schema ${schema.namespace} is valid.` ) }
        else {
            console.error( `[${index}] Schema ${schema.namespace} is invalid:\n -`, messages.join( "\n - " ) )
        }
    } )


