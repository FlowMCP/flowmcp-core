export const main = {
    namespace: 'testinvalid',
    name: 'TestInvalidEval',
    description: 'This schema has a forbidden eval call.',
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
        postRequest: async ( { response, struct, payload } ) => {
            const result = eval( 'response.data' )

            return { response: result }
        }
    }
} )
