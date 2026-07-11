import { describe, test, expect } from '@jest/globals'
import * as v4 from '../../../src/v4/index.mjs'
import { HandlerFactory } from '../../../src/v4/index.mjs'


describe( 'v4 export contract (Memo 152 / PRD-008, B-01)', () => {
    test( 'exports the runtime surface the CLI/grading pull from v2 today', () => {
        const required = [
            'Fetch', 'ResourceExecutor', 'SharedListResolver', 'HandlerFactory',
            'ZodBuilder', 'SecurityScanner', 'SchemaLoader', 'LibraryLoader',
            'SkillLoader', 'ResourceValidator', 'ResourceMarkdownLoader',
            'PromptValidator', 'PromptLoader', 'FlowMCP', 'Pipeline'
        ]

        required
            .forEach( ( name ) => {
                expect( v4[ name ] ).toBeDefined()
            } )
    } )


    test( 'FlowMCP facade exposes the public runtime members', () => {
        const { FlowMCP } = v4

        expect( typeof FlowMCP.fetch ).toBe( 'function' )
        expect( typeof FlowMCP.executeResource ).toBe( 'function' )
        expect( typeof FlowMCP.resolveSharedLists ).toBe( 'function' )
        expect( typeof FlowMCP.createHandlers ).toBe( 'function' )
        expect( typeof FlowMCP.buildToolName ).toBe( 'function' )
    } )


    test( 'HandlerFactory.create uses pre-resolved libraries without re-loading', () => {
        const injected = { marker: { value: 42 } }
        let seen = null

        const handlersFn = ( { libraries } ) => {
            seen = libraries

            return {
                getStatus: {
                    postRequest: async ( { struct } ) => ( { struct } )
                }
            }
        }

        const { handlerMap } = HandlerFactory.create( {
            handlersFn,
            sharedLists: {},
            libraries: injected,
            routeNames: [ 'getStatus' ],
            resources: {}
        } )

        expect( seen ).toBe( injected )
        expect( handlerMap[ 'getStatus' ] ).toBeDefined()
    } )
} )
