import { describe, test, expect } from '@jest/globals'
import { FlowMCP } from '../../src/v2/index.mjs'


describe( 'FlowMCP.initializeResourceDbs (regression #85)', () => {
    test( 'does not throw ReferenceError when called through the public wrapper', async () => {
        const result = await FlowMCP
            .initializeResourceDbs( { resources: {}, schemaRef: 'regression-85' } )

        expect( result ).toBeDefined()
    } )


    test( 'ignores non-sqlite resources without touching any connection', async () => {
        const resources = {
            someDoc: { source: 'markdown', origin: 'project', name: 'doc.md' }
        }

        const result = await FlowMCP
            .initializeResourceDbs( { resources, schemaRef: 'regression-85-non-sqlite' } )

        expect( result ).toBeDefined()
    } )
} )
