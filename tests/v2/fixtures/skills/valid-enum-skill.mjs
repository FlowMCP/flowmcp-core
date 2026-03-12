const content = `
## Instructions

Fetch data for {{input:address}} on {{input:network}}.
Use {{tool:getContractAbi}} to retrieve the ABI.
`


export const skill = {
    name: 'enum-skill',
    version: 'flowmcp-skill/1.0.0',
    description: 'A skill with enum input parameter.',
    requires: {
        tools: [ 'getContractAbi' ],
        resources: [],
        external: []
    },
    input: [
        {
            key: 'address',
            type: 'string',
            description: 'Contract address',
            required: true
        },
        {
            key: 'network',
            type: 'enum',
            description: 'Target network',
            required: true,
            values: [ 'ethereum', 'polygon', 'arbitrum' ]
        }
    ],
    output: 'Contract data for the selected network.',
    content
}
