import { something } from 'some-module'

export const main = {
    namespace: 'testinvalid',
    name: 'TestInvalidImport',
    description: 'This schema has a forbidden import statement.',
    version: '2.0.0',
    root: 'https://api.example.com',
    routes: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns status.',
            parameters: []
        }
    }
}
