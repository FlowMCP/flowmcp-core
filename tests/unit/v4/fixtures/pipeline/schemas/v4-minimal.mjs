export const main = {
    namespace: 'pipelinetest',
    name: 'PipelineMinimal',
    description: 'Minimal v4 schema for Pipeline tests.',
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
