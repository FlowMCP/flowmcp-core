export const main = {
    namespace: 'testinvalid',
    name: 'TestInvalidProcess',
    description: 'This schema accesses process.env which is forbidden.',
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


export const handlers = ( { sharedLists, libraries } ) => ( {
    getStatus: {
        preRequest: async ( { struct, payload } ) => {
            const secret = process.env.SECRET_KEY
            struct['headers']['Authorization'] = secret

            return { struct, payload }
        }
    }
} )
