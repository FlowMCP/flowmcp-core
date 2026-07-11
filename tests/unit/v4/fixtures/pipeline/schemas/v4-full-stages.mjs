// v4 fixture that exercises the scan, skills-content and resources stages so the
// Pipeline.load stage toggles (Memo 152 / PRD-008, B-08a) can be proven to gate them.
export const main = {
    namespace: 'fullstages',
    name: 'FullStages',
    description: 'A v4 schema with a tool and a sqlite resource for stage-toggle tests.',
    version: '4.0.0',
    root: 'https://api.example.com',
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
