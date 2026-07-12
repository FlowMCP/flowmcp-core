// v4 fixture carrying a top-level `skills` block (Memo 152 / PRD-027, dormancy proof).
// The v4 schema shape FORBIDS main.skills (MainValidator VAL016 — skills are namespace-,
// selection- or agent-scoped). Pipeline.load therefore rejects this fixture fail-loud at the
// MainValidator step, which is exactly WHY the skills-stage modules PrefillExecutor and the
// PlaceholderResolver skill-content branch cannot be reached through the validating production
// loader (the skills stage always runs with an empty skills set). This fixture pins that gate.
export const main = {
    namespace: 'skilldormant',
    name: 'SkillDormant',
    description: 'A v4 schema that (illegally) declares a top-level skills block.',
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
    },
    skills: {
        onboarding: {
            file: './skills/onboarding.mjs',
            content: 'Use {{namespace}} to check status.',
            prefill: [ { key: 'status', tool: 'getStatus' } ]
        }
    }
}
