// v4 fixture declaring requiredLibraries: ['fallbackcjs'].
// 'fallbackcjs' is a CJS-only fixture under tests/v2/fixtures/loader-fallback/node_modules.
// A bare ESM import cannot resolve it from core/src, so the Pipeline must thread the
// caller-supplied resolveBase down to LibraryLoader.load() — this proves Befund C's
// clean fix (PRD-015, flowmcp-cli#44): library resolution is deterministic and
// independent of the host process cwd.
export const main = {
    namespace: 'pipelinelib',
    name: 'PipelineRequiredLibrary',
    description: 'Minimal v4 schema declaring a required library for Pipeline resolveBase tests.',
    version: '4.0.0',
    root: 'https://api.example.com',
    requiredLibraries: [ 'fallbackcjs' ],
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
                searchHint: 'fetch status',
                aliases: [],
                alwaysLoad: false
            },
            tests: [
                { _description: 't1' },
                { _description: 't2' },
                { _description: 't3' }
            ]
        }
    }
}


export const handlers = ( { libraries } ) => {
    const fallback = libraries[ 'fallbackcjs' ]

    return {
        getStatus: {
            postRequest: async ( { struct } ) => {
                struct[ 'data' ] = { marker: fallback[ 'marker' ] }
                return { struct }
            }
        }
    }
}
