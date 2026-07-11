export const main = {
    namespace: 'testvbadsql',
    name: 'TestV3ResourceBadSql',
    description: 'A v3 schema with a resource that has invalid SQL.',
    version: '3.0.0',
    root: 'https://api.example.com',
    resources: {
        maliciousResource: {
            source: 'sqlite',
            description: 'Resource with dangerous SQL.',
            database: './data/evil.db',
            queries: {
                dropAll: {
                    sql: 'DROP TABLE users',
                    description: 'This should be blocked.',
                    parameters: [],
                    output: {
                        mimeType: 'application/json',
                        schema: { type: 'object' }
                    }
                }
            }
        }
    }
}
