export const main = {
    namespace: 'testskill',
    name: 'TestSkillOnly',
    description: 'A v3 schema with only skills, no tools.',
    version: '3.0.0',
    root: 'https://api.example.com',
    skills: {
        'contract-audit': {
            file: './skills/contract-audit.mjs'
        }
    }
}
