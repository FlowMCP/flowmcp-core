// v4 fixture declaring a top-level `prompts` key (Memo 152 / PRD-010, F-10).
// Rebuilt from the v2 pipeline-prompts scenario at version 4.0.0. NOTE: under the
// v4-only schema shape `prompts` is NOT an allowed main key (0/564 real schemas use
// it; parallels `skills` being main-forbidden), so Pipeline.load rejects this
// fixture fail-loud. Positive prompt-loading coverage lives at the PromptLoader
// module level (PromptLoader.test.mjs). Content files reused from ../../prompts.
export const main = {
    namespace: 'testprovider',
    name: 'TestProvider',
    description: 'A v4 schema with provider prompts.',
    version: '4.0.0',
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
    prompts: {
        about: {
            name: 'about',
            version: 'flowmcp-prompt/1.0.0',
            namespace: 'testprovider',
            description: 'Overview of TestProvider — tools and workflows',
            dependsOn: [ 'getContractAbi' ],
            references: [],
            contentFile: '../../prompts/about.mjs'
        }
    }
}
