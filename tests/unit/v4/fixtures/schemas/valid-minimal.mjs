export const main = {
    namespace: 'testminimal',
    name: 'TestMinimal',
    description: 'A minimal valid v2 schema without handlers.',
    version: '2.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    routes: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns the API status.',
            parameters: []
        }
    }
}
