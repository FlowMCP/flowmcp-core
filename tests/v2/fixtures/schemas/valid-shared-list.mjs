export const main = {
    namespace: 'testsharedlist',
    name: 'TestSharedList',
    description: 'A v2 schema using shared lists.',
    version: '2.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    sharedLists: [
        {
            ref: 'evmChains',
            version: '1.0.0',
            filter: {
                key: 'mainnet',
                value: true
            }
        }
    ],
    routes: {
        getChainData: {
            method: 'GET',
            path: '/chains/{{chainId}}',
            description: 'Returns data for a specific chain.',
            parameters: [
                {
                    position: { key: 'chainId', value: '{{USER_PARAM}}', location: 'insert' },
                    z: { primitive: 'enum({{evmChains:chainId}})', options: [] }
                }
            ]
        }
    }
}


export const handlers = ( { sharedLists, libraries } ) => ( {
    getChainData: {
        preRequest: async ( { struct, payload } ) => {
            const chains = sharedLists['evmChains']
            const chain = chains
                .find( ( entry ) => {
                    const match = String( entry['chainId'] ) === String( payload['chainId'] )

                    return match
                } )

            if( chain ) {
                struct['headers']['X-Chain-Name'] = chain['name']
            }

            return { struct, payload }
        }
    }
} )
