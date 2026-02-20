// jest.config.js
export default {
    testEnvironment: 'node',
    transform: {},
    verbose: true,
    roots: [ './tests' ],
    collectCoverageFrom: [
        'src/**/*.mjs'
    ],
    coverageThreshold: {
        global: {
            statements: 70,
            branches: 60,
            functions: 70,
            lines: 70
        }
    },
    coverageReporters: [ 'text', 'lcov', 'html' ]
}