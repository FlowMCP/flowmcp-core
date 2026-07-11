// v4 fixture exercising the resources-through-Pipeline path (Memo 152 / PRD-010, F-10).
// A tool plus a sqlite resource so ResourceValidator + ResourceDatabaseManager run.
export const main = {
    namespace: 'resourceprovider',
    name: 'ResourceProvider',
    description: 'A v4 schema with a tool and a sqlite resource.',
    version: '4.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns API status.',
            parameters: [],
            meta: {
                isReadOnly: true,
                isConcurrencySafe: true,
                isDestructive: false,
                searchHint: 'read status',
                aliases: [],
                alwaysLoad: false
            },
            tests: [
                { _description: 't1' },
                { _description: 't2' },
                { _description: 't3' }
            ]
        }
    },
    resources: {
        verifiedContracts: {
            source: 'sqlite',
            description: 'Verified smart contracts database.',
            database: './data/contracts.db',
            queries: {
                getByAddress: {
                    sql: 'SELECT * FROM contracts WHERE address = ?',
                    description: 'Fetch contract by address.',
                    parameters: [
                        {
                            position: { key: 'address', value: '{{USER_PARAM}}' },
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
