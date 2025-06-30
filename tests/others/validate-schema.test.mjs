import { FlowMCP } from '../../src/index.mjs'


describe( 'Schema Validierung via FlowMCP.validateSchema()', () => {
    const schemas = [
        {
            namespace: 'poap',
            name: 'POAP GraphQL',
            description: 'GraphQL endpoint for accessing POAP event data and metadata',
            docs: [ 'https://public.compass.poap.tech/v1/graphql' ],
            tags: [ 'production', 'poap.getTypename' ],
            flowMCP: '1.2.0',
            root: 'https://public.compass.poap.tech/v1/graphql',
            requiredServerParams: [],
            headers: {
                'content-type': 'application/json'
            },
            routes: {
                getTypename: {
                    requestMethod: 'POST',
                    description: 'Basic connectivity test to retrieve __typename from the POAP GraphQL endpoint',
                    route: '/',
                    parameters: [
                        {
                            position: {
                                key: 'query',
                                value: 'query { __typename }',
                                location: 'body'
                            },
                            z: {
                                primitive: 'string()',
                                options: []
                            }
                        }
                    ],
                    tests: [ { _description: 'Run GraphQL __typename test' } ],
                    modifiers: []
                }
            },
            handlers: {}
        },
        {
            namespace: 'example',
            name: 'Example API',
            description: 'An example API for testing purposes',
            docs: [ 'https://example.com/docs' ],
            tags: [ 'example', 'test' ],
            flowMCP: '1.2.0',
            root: 'https://api.example.com',
            requiredServerParams: [],
            handlers: {}
        }
    ]


    it.each( schemas.map( ( schema, i ) => [ i, schema.namespace, schema ] ) )(
        '[%d] validiert Schema %s',

        ( index, namespace, schema ) => {
            const ex = [ true, false ]
            const { status, messages } = FlowMCP.validateSchema( { schema } )
            expect( status ).toBe( ex[index] )
        }
    )
} )
