const content = `
## Step 1

Use {{tool:getContractAbi}} to fetch the ABI for {{input:address}}.

## Step 2

Check {{resource:verifiedContracts}} for known contracts.

## Step 3

For a quick version, follow {{skill:quick-check}}.
`


export const skill = {
    name: 'all-placeholders',
    version: 'flowmcp-skill/1.0.0',
    description: 'A skill that uses all placeholder types.',
    requires: {
        tools: [ 'getContractAbi' ],
        resources: [ 'verifiedContracts' ],
        external: [ 'playwright' ]
    },
    input: [
        {
            key: 'address',
            type: 'string',
            description: 'Contract address',
            required: true
        }
    ],
    output: 'Markdown report.',
    content
}
