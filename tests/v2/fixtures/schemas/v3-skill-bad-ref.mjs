export const main = {
    namespace: 'testvbadskill',
    name: 'TestV3SkillBadRef',
    description: 'A v3 schema where skill references a non-existent tool.',
    version: '3.0.0',
    root: 'https://api.example.com',
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns the API status.',
            parameters: []
        }
    },
    skills: {
        'valid-skill': {
            file: '../skills/valid-skill.mjs'
        }
    }
}
