const schema = {
    flowMCP: '1.2.0',
    namespace: 'testlegacy',
    name: 'Test Legacy Schema',
    description: 'A v1.2.0 format schema for backward compatibility testing.',
    root: 'https://api.example.com',
    requiredServerParams: [ 'API_KEY' ],
    routes: {
        getBalance: {
            requestMethod: 'GET',
            route: '/balance/{{address}}',
            description: 'Returns the balance for an address.',
            parameters: [
                {
                    position: { key: 'address', value: '{{USER_PARAM}}', location: 'insert' },
                    z: { primitive: 'string()', options: [ 'min(1)' ] }
                },
                {
                    position: { key: 'apiKey', value: '{{SERVER_PARAM:API_KEY}}', location: 'query' },
                    z: { primitive: 'string()', options: [] }
                }
            ],
            modifiers: [
                {
                    phase: 'post',
                    type: 'transform',
                    fn: ( { struct, payload, userParams, routeName, phaseType } ) => {
                        struct['data'] = { balance: struct['data']['result'] }

                        return { struct, payload }
                    }
                }
            ],
            tests: [
                {
                    _description: 'Get balance for test address',
                    address: '0x1234567890abcdef1234567890abcdef12345678'
                }
            ]
        }
    }
}


export { schema }
