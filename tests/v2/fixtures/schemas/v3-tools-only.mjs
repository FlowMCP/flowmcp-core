export const main = {
    namespace: 'testvtools',
    name: 'TestV3ToolsOnly',
    description: 'A v3 schema with only tools, no routes key.',
    version: '3.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns the API status.',
            parameters: []
        },
        getHealth: {
            method: 'GET',
            path: '/health',
            description: 'Returns health information.',
            parameters: []
        }
    }
}
