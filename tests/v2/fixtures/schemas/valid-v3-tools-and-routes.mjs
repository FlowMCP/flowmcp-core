export const main = {
    namespace: 'testambiguous',
    name: 'TestAmbiguous',
    description: 'A schema with both tools and routes — ambiguous.',
    version: '3.0.0',
    root: 'https://api.example.com',
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns status.',
            parameters: []
        }
    },
    routes: {
        getHealth: {
            method: 'GET',
            path: '/health',
            description: 'Returns health.',
            parameters: []
        }
    }
}
