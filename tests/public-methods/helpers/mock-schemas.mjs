const mockSchemas = [
    {
        namespace: 'luksoNetwork',
        name: 'LUKSO Network API',
        description: 'LUKSO blockchain data access',
        docs: [ 'https://docs.lukso.tech' ],
        tags: [ 'blockchain', 'lukso' ],
        flowMCP: '1.2.2',
        root: 'https://api.lukso.network',
        requiredServerParams: [ 'API_KEY' ],
        headers: {
            'Authorization': 'Bearer {{API_KEY}}',
            'Content-Type': 'application/json'
        },
        routes: {
            getBlocks: {
                requestMethod: 'GET',
                description: 'Get blockchain blocks',
                route: '/blocks',
                parameters: [
                    { position: { key: 'limit', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: [ 'min(1)', 'max(100)', 'default(10)' ] } }
                ],
                tests: [
                    { _description: 'Get 10 blocks', limit: 10 }
                ],
                modifiers: []
            },
            getBalance: {
                requestMethod: 'GET',
                description: 'Get account balance',
                route: '/balance/:address',
                parameters: [
                    { position: { key: 'address', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [ 'length(42)' ] } }
                ],
                tests: [
                    { _description: 'Get balance for address', address: '0x1234567890123456789012345678901234567890' }
                ],
                modifiers: []
            },
            getTransactions: {
                requestMethod: 'POST',
                description: 'Get transactions',
                route: '/transactions',
                parameters: [
                    { position: { key: 'from', value: '{{USER_PARAM}}', location: 'body' }, z: { primitive: 'string()', options: [ 'length(42)' ] } },
                    { position: { key: 'to', value: '{{USER_PARAM}}', location: 'body' }, z: { primitive: 'string()', options: [ 'length(42)' ] } }
                ],
                tests: [
                    { _description: 'Get transactions between addresses', from: '0x1111111111111111111111111111111111111111', to: '0x2222222222222222222222222222222222222222' }
                ],
                modifiers: []
            }
        },
        handlers: {}
    },
    {
        namespace: 'coingecko',
        name: 'CoinGecko API',
        description: 'Cryptocurrency market data',
        docs: [ 'https://coingecko.com/api' ],
        tags: [ 'crypto', 'market' ],
        flowMCP: '1.2.2',
        root: 'https://api.coingecko.com/api/v3',
        requiredServerParams: [],
        headers: {
            'Accept': 'application/json'
        },
        routes: {
            getPrice: {
                requestMethod: 'GET',
                description: 'Get cryptocurrency prices',
                route: '/simple/price',
                parameters: [
                    { position: { key: 'ids', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [] } },
                    { position: { key: 'vs_currencies', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [ 'default(usd)' ] } }
                ],
                tests: [
                    { _description: 'Get Bitcoin price in USD', ids: 'bitcoin', vs_currencies: 'usd' }
                ],
                modifiers: []
            },
            getMarkets: {
                requestMethod: 'GET',
                description: 'Get coin markets',
                route: '/coins/markets',
                parameters: [
                    { position: { key: 'vs_currency', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [ 'default(usd)' ] } },
                    { position: { key: 'per_page', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: [ 'min(1)', 'max(250)', 'default(100)' ] } }
                ],
                tests: [
                    { _description: 'Get top 100 markets', vs_currency: 'usd', per_page: 100 }
                ],
                modifiers: []
            }
        },
        handlers: {}
    },
    {
        namespace: 'testNamespace',
        name: 'Test API',
        description: 'Test namespace for filtering',
        docs: [],
        tags: [ 'test', 'demo' ],
        flowMCP: '1.2.2',
        root: 'https://test.example.com',
        requiredServerParams: [],
        headers: {},
        routes: {
            testRoute: {
                requestMethod: 'GET',
                description: 'Test route',
                route: '/test',
                parameters: [],
                tests: [
                    { _description: 'Simple test' }
                ],
                modifiers: []
            }
        },
        handlers: {}
    }
]

const mockServerParams = {
    API_KEY: 'test-api-key-12345'
}

const mockUserParams = {
    limit: 10,
    address: '0x1234567890123456789012345678901234567890',
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    ids: 'bitcoin',
    vs_currencies: 'usd',
    vs_currency: 'usd',
    per_page: 100
}

const invalidSchema = {
    namespace: '',
    name: 'Invalid Schema',
    requiredServerParams: [],
    // Missing required fields
}

const suppressConsoleWarn = () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )
}


export { mockSchemas, mockServerParams, mockUserParams, invalidSchema, suppressConsoleWarn }