export const main = {
    namespace: 'testvresonly',
    name: 'TestV3ResourceOnly',
    description: 'A v3 schema with only resources, no tools (E1).',
    version: '3.0.0',
    root: 'https://api.example.com',
    resources: {
        tokenLookup: {
            source: 'sqlite',
            description: 'Token metadata lookup database.',
            database: './data/tokens.db',
            queries: {
                bySymbol: {
                    sql: 'SELECT * FROM tokens WHERE symbol = ?',
                    description: 'Find token by ticker symbol.',
                    parameters: [
                        {
                            position: { key: 'symbol', value: '{{USER_PARAM}}' },
                            z: { primitive: 'string()', options: [ 'min(1)' ] }
                        }
                    ],
                    output: {
                        mimeType: 'application/json',
                        schema: { type: 'object' }
                    }
                }
            }
        }
    }
}
