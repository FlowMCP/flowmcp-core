const content = `
## Step 1: Retrieve Data

Call {{tool:getContractAbi}} with the contract address {{input:address}}.

## Step 2: Analyze

Review the ABI and produce a report.
`


export const skill = {
    name: 'valid-skill',
    version: 'flowmcp-skill/1.0.0',
    description: 'A valid test skill for contract analysis.',
    requires: {
        tools: [ 'getContractAbi' ],
        resources: [],
        external: []
    },
    input: [
        {
            key: 'address',
            type: 'string',
            description: 'Ethereum contract address',
            required: true
        }
    ],
    output: 'Markdown report with ABI analysis.',
    content
}
