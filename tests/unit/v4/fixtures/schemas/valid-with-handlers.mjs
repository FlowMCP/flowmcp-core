export const main = {
    namespace: 'testhandlers',
    name: 'TestHandlers',
    description: 'A v2 schema with handler factory.',
    version: '2.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    requiredServerParams: [ 'API_KEY' ],
    routes: {
        getUser: {
            method: 'GET',
            path: '/users/{{userId}}',
            description: 'Returns user by ID.',
            parameters: [
                {
                    position: { key: 'userId', value: '{{USER_PARAM}}', location: 'insert' },
                    z: { primitive: 'string()', options: [ 'min(1)' ] }
                },
                {
                    position: { key: 'apiKey', value: '{{SERVER_PARAM:API_KEY}}', location: 'query' },
                    z: { primitive: 'string()', options: [] }
                }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' }
                    }
                }
            }
        }
    }
}


export const handlers = ( { sharedLists, libraries } ) => ( {
    getUser: {
        postRequest: async ( { response, struct, payload } ) => {
            const transformed = {
                id: response['id'],
                name: response['name'],
                fetched: true
            }

            return { response: transformed }
        }
    }
} )
