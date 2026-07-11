export const main = {
    namespace: 'testresource',
    name: 'TestResourceOnly',
    description: 'A v3 schema with only resources, no tools.',
    version: '3.0.0',
    root: 'https://api.example.com',
    resources: {
        verifiedContracts: {
            source: 'sqlite',
            description: 'Verified smart contracts database.',
            database: './data/contracts.db',
            queries: {
                getByAddress: {
                    sql: 'SELECT * FROM contracts WHERE address = ?',
                    parameters: [],
                    output: { mimeType: 'application/json', schema: { type: 'object' } }
                }
            }
        }
    }
}
