export const main = {
    namespace: 'prefilltest',
    name: 'PrefillTest',
    description: 'A v4 schema with one tool, used for prefill execution tests.',
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
                searchHint: 'fetch status',
                aliases: [],
                alwaysLoad: false
            },
            tests: [
                { _description: 't1' },
                { _description: 't2' },
                { _description: 't3' }
            ]
        }
    }
}
