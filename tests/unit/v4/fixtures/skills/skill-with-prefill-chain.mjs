// Memo 153 / Rest-Item 6 (F4=B) — a committed skill fixture carrying BOTH a `prefill`
// declaration AND placeholder `content` that references the prefilled value. It is the artifact
// behind the chained PrefillExecutor -> PlaceholderResolver proof (PrefillPlaceholderChain test):
// the exact Pipeline.mjs :523 (#runPrefill -> PrefillExecutor.execute) -> :587
// (#resolveSkillContents -> PlaceholderResolver.resolve) data flow, exercised end-to-end.
//
// HONEST SCOPE: a schema cannot carry this skill through Pipeline.load — MainValidator VAL016
// forbids main.skills, so the validating production loader never reaches the prefill stage (see
// becomes-live-e2e.test.mjs "PRD-027 dormancy proof"). This fixture therefore feeds the two
// skills-stage modules DIRECTLY, exactly as Pipeline.#runPrefill / #resolveSkillContents call
// them internally — the maximal honest realization of F4=B given the VAL016 gate.

const content = `## Service Status

Current status: {{prefill:getStatus}}.

Checked for {{input:service}}.
`


export const skill = {
    name: 'status-with-prefill',
    version: 'flowmcp-skill/1.0.0',
    description: 'A skill that prefills a tool result and resolves it into its content.',
    requires: {
        tools: [ 'getStatus' ],
        resources: [],
        external: []
    },
    input: [
        {
            key: 'service',
            type: 'string',
            description: 'Service name',
            required: true
        }
    ],
    output: 'Markdown status report.',
    prefill: [
        { tool: 'getStatus', params: {} }
    ],
    content
}
