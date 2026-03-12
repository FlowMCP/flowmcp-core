export const main = {
    namespace: 'testvskills',
    name: 'TestV3ToolsWithSkills',
    description: 'A v3 schema with tools and skills.',
    version: '3.0.0',
    root: 'https://api.example.com',
    tags: [ 'test' ],
    tools: {
        getContractAbi: {
            method: 'GET',
            path: '/api/abi',
            description: 'Returns the contract ABI.',
            parameters: [
                {
                    position: { key: 'address', value: '{{USER_PARAM}}', location: 'query' },
                    z: { primitive: 'string()', options: [ 'min(1)' ] }
                }
            ],
            tests: [
                { _description: 'Test 1', address: '0x1234567890abcdef1234567890abcdef12345678' },
                { _description: 'Test 2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
                { _description: 'Test 3', address: '0x0000000000000000000000000000000000000001' }
            ]
        }
    },
    skills: {
        'valid-skill': {
            file: '../skills/valid-skill.mjs'
        }
    }
}
