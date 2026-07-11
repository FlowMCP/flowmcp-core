const content = `
## Instructions

This is a simple informational skill with no placeholders.

Just follow these steps and produce a report.
`


export const skill = {
    name: 'no-placeholders',
    version: 'flowmcp-skill/1.0.0',
    description: 'A skill without any placeholders.',
    requires: {
        tools: [],
        resources: [],
        external: []
    },
    input: [],
    output: 'A simple report.',
    content
}
