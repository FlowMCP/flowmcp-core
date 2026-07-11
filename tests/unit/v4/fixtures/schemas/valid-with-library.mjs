export const main = {
    namespace: 'testlibrary',
    name: 'TestLibrary',
    description: 'A v2 schema requiring an external library.',
    version: '2.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    requiredLibraries: [ 'ethers' ],
    routes: {
        resolveAddress: {
            method: 'GET',
            path: '/resolve/{{address}}',
            description: 'Resolves an Ethereum address.',
            parameters: [
                {
                    position: { key: 'address', value: '{{USER_PARAM}}', location: 'insert' },
                    z: { primitive: 'string()', options: [ 'min(42)', 'max(42)' ] }
                }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        checksumAddress: { type: 'string' }
                    }
                }
            }
        }
    }
}


export const handlers = ( { sharedLists, libraries } ) => ( {
    resolveAddress: {
        preRequest: async ( { struct, payload } ) => {
            const { ethers } = libraries
            const checksummed = ethers.getAddress( payload['address'] )
            payload['address'] = checksummed

            return { struct, payload }
        }
    }
} )
