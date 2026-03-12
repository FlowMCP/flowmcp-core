export const main = {
    namespace: 'testtools',
    name: 'TestTools',
    description: 'A v3 schema using tools key.',
    version: '3.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns the API status.',
            parameters: [],
            tests: [
                { _description: 'Test 1' },
                { _description: 'Test 2' },
                { _description: 'Test 3' }
            ]
        }
    }
}
