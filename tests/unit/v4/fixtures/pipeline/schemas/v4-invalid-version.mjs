export const main = {
    namespace: 'invalidversion',
    name: 'InvalidVersion',
    description: 'A schema with a v2 version — must fail v4 MainValidator.',
    version: '2.0.0',
    root: 'https://api.example.com',
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'd',
            parameters: [],
            meta: {
                isReadOnly: true,
                isConcurrencySafe: true,
                isDestructive: false,
                searchHint: 's',
                aliases: [],
                alwaysLoad: false
            }
        }
    }
}
