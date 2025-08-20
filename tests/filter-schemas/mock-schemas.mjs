export const mockSchemas = [
    {
        namespace: 'testNamespaceA',
        tags: [ 'apiProvider', 'blockchain' ],
        routes: {
            'getBalance': { method: 'GET', path: '/balance' },
            'sendTransaction': { method: 'POST', path: '/transaction' },
            'getBlocks': { method: 'GET', path: '/blocks' }
        }
    },
    {
        namespace: 'testNamespaceB',
        tags: [ 'dataProvider', 'analytics' ],
        routes: {
            'getData': { method: 'GET', path: '/data' },
            'processData': { method: 'POST', path: '/process' }
        }
    },
    {
        namespace: 'testNamespaceC',
        tags: [ 'blockchain', 'defi' ],
        routes: {
            'getPrice': { method: 'GET', path: '/price' },
            'swapTokens': { method: 'POST', path: '/swap' },
            'getPoolInfo': { method: 'GET', path: '/pool' }
        }
    },
    {
        namespace: 'luksoNetwork',
        tags: [ 'luksoNetwork', 'blockchain' ],
        routes: {
            'getBlocks': { method: 'GET', path: '/blocks' },
            'getBlockTransactions': { method: 'GET', path: '/block/transactions' },
            'getBalance': { method: 'GET', path: '/balance' }
        }
    },
    {
        namespace: 'emptyRoutes',
        tags: [ 'test' ],
        routes: {}
    },
    {
        namespace: 'MixedCaseNamespace',
        tags: [ 'BLOCKCHAIN', 'TestTag' ],
        routes: {
            'GetData': { method: 'GET', path: '/data' },
            'PostData': { method: 'POST', path: '/data' }
        }
    }
]

export const expectedResults = {
    onlyLuksoNetwork: [
        {
            namespace: 'luksoNetwork',
            tags: [ 'luksoNetwork', 'blockchain' ],
            routes: {
                'getBlocks': { method: 'GET', path: '/blocks' },
                'getBlockTransactions': { method: 'GET', path: '/block/transactions' },
                'getBalance': { method: 'GET', path: '/balance' }
            }
        }
    ],
    blockchainTag: [
        {
            namespace: 'testNamespaceA',
            tags: [ 'apiProvider', 'blockchain' ],
            routes: {
                'getBalance': { method: 'GET', path: '/balance' },
                'sendTransaction': { method: 'POST', path: '/transaction' },
                'getBlocks': { method: 'GET', path: '/blocks' }
            }
        },
        {
            namespace: 'testNamespaceC',
            tags: [ 'blockchain', 'defi' ],
            routes: {
                'getPrice': { method: 'GET', path: '/price' },
                'swapTokens': { method: 'POST', path: '/swap' },
                'getPoolInfo': { method: 'GET', path: '/pool' }
            }
        },
        {
            namespace: 'luksoNetwork',
            tags: [ 'luksoNetwork', 'blockchain' ],
            routes: {
                'getBlocks': { method: 'GET', path: '/blocks' },
                'getBlockTransactions': { method: 'GET', path: '/block/transactions' },
                'getBalance': { method: 'GET', path: '/balance' }
            }
        }
    ]
}