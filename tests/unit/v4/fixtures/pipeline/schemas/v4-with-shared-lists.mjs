// v4 fixture declaring a sharedLists reference. Loading it without a listsDir in
// strict mode must fail loud with LST-001 (Memo 152 / PRD-008, B-08c).
export const main = {
    namespace: 'sharedlists',
    name: 'SharedListsFixture',
    description: 'A v4 schema declaring a sharedLists reference.',
    version: '4.0.0',
    root: 'https://api.example.com',
    sharedLists: [
        { ref: 'evmChains', version: '1.0.0' }
    ],
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
    }
}
