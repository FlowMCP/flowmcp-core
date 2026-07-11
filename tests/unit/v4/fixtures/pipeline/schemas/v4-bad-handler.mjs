// v4 fixture whose handlers factory returns a key that matches no tool/resource.
// HandlerFactory rejects it; in strict mode the Pipeline surfaces HND-001
// (Memo 152 / PRD-008, B-08c).
export const main = {
    namespace: 'badhandler',
    name: 'BadHandler',
    description: 'A v4 schema whose handler key does not match any route.',
    version: '4.0.0',
    root: 'https://api.example.com',
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns API status.',
            parameters: [],
            meta: {
                isReadOnly: true,
                isConcurrencySafe: true,
                isDestructive: false,
                searchHint: 'read status',
                aliases: [],
                alwaysLoad: false
            },
            tests: [
                { _description: 't1' },
                { _description: 't2' },
                { _description: 't3' }
            ]
        }
    }
}


export const handlers = () => ( {
    nonExistentRoute: {
        postRequest: async ( { struct } ) => ( { struct } )
    }
} )
