import { describe, it, expect } from '@jest/globals'

import { ZodBuilder } from '../../../src/v4/task/ZodBuilder.mjs'


describe( 'ZodBuilder.getZodSchema', () => {
    it( 'builds schema for string parameters', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'name', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'string()', 'options': [] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'name' )
        const parsed = zodSchema[ 'name' ].safeParse( 'hello' )
        expect( parsed[ 'success' ] ).toBe( true )
    } )


    it( 'builds schema for number parameters with min/max', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'limit', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'number()', 'options': [ 'min(1)', 'max(100)' ] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'limit' )
        const validResult = zodSchema[ 'limit' ].safeParse( 50 )
        expect( validResult[ 'success' ] ).toBe( true )
        const invalidResult = zodSchema[ 'limit' ].safeParse( 0 )
        expect( invalidResult[ 'success' ] ).toBe( false )
    } )


    it( 'builds schema for enum parameters', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'interval', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'enum(h1,d1,w1)', 'options': [] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'interval' )
        const validResult = zodSchema[ 'interval' ].safeParse( 'h1' )
        expect( validResult[ 'success' ] ).toBe( true )
        const invalidResult = zodSchema[ 'interval' ].safeParse( 'invalid' )
        expect( invalidResult[ 'success' ] ).toBe( false )
    } )


    it( 'handles optional parameters', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'search', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'string()', 'options': [ 'optional()' ] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'search' )
        const undefinedResult = zodSchema[ 'search' ].safeParse( undefined )
        expect( undefinedResult[ 'success' ] ).toBe( true )
    } )


    it( 'handles default values', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'limit', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'number()', 'options': [ 'default(10)' ] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'limit' )
        const parsed = zodSchema[ 'limit' ].parse( undefined )
        // Memo 152 / PRD-012 (B-03) — core ZodBuilder types default(N) on number()
        // as a real number (10), fixing the CLI fork's string coercion ('10').
        expect( parsed ).toBe( 10 )
    } )


    it( 'skips parameters without z definition', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'apiKey', 'value': '{{SERVER_PARAM:API_KEY}}', 'location': 'query' }
                },
                {
                    'position': { 'key': 'name', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'string()', 'options': [] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).not.toHaveProperty( 'apiKey' )
        expect( zodSchema ).toHaveProperty( 'name' )
    } )


    it( 'handles boolean parameters', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'verbose', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'boolean()', 'options': [] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'verbose' )
        const validResult = zodSchema[ 'verbose' ].safeParse( true )
        expect( validResult[ 'success' ] ).toBe( true )
        const invalidResult = zodSchema[ 'verbose' ].safeParse( 'yes' )
        expect( invalidResult[ 'success' ] ).toBe( false )
    } )


    it( 'returns empty schema for route without parameters', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( Object.keys( zodSchema ).length ).toBe( 0 )
    } )


    it( 'handles regex option', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'address', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'string()', 'options': [ 'regex(^0x[a-fA-F0-9]{40}$)' ] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'address' )
        const validResult = zodSchema[ 'address' ].safeParse( '0x1234567890abcdef1234567890abcdef12345678' )
        expect( validResult[ 'success' ] ).toBe( true )
        const invalidResult = zodSchema[ 'address' ].safeParse( 'invalid' )
        expect( invalidResult[ 'success' ] ).toBe( false )
    } )


    it( 'handles multiple options combined', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'page', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'number()', 'options': [ 'min(1)', 'max(1000)', 'optional()', 'default(1)' ] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'page' )
        const parsed = zodSchema[ 'page' ].parse( undefined )
        // Memo 152 / PRD-012 (B-03) — typed default: number() default(1) -> 1 (not '1').
        expect( parsed ).toBe( 1 )
    } )


    // Memo 152 / PRD-028 (A-15 serve smoke) — the real schema corpus declares options in
    // wrapper-first order ['optional()','default(N)','min(0)','max(100)']. Before the fix this
    // threw "_interface.min is not a function" (min applied to a ZodOptional/ZodDefault wrapper)
    // and 435/522 tools could not register in `flowmcp run`. The builder now applies constraints
    // before wrappers regardless of declared order.
    it( 'applies constraints before wrappers for wrapper-first option order (serve corpus shape)', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'maxResults', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'number()', 'options': [ 'optional()', 'default(10)', 'min(1)', 'max(100)' ] }
                }
            ],
            'tests': []
        }

        // Must NOT throw (the 435-tools serve regression).
        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'maxResults' )
        // Typed default survives the reorder (B-12): number default is a real number.
        expect( zodSchema[ 'maxResults' ].parse( undefined ) ).toBe( 10 )
        // The constraints actually apply (they reached the base number type, not a wrapper).
        expect( zodSchema[ 'maxResults' ].safeParse( 50 )[ 'success' ] ).toBe( true )
        expect( zodSchema[ 'maxResults' ].safeParse( 0 )[ 'success' ] ).toBe( false )
        expect( zodSchema[ 'maxResults' ].safeParse( 200 )[ 'success' ] ).toBe( false )
    } )


    it( 'keeps a typed boolean default through a wrapper-first order (B-12)', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'verbose', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'boolean()', 'options': [ 'optional()', 'default(true)' ] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema ).toHaveProperty( 'verbose' )
        // Typed boolean default: default(true) -> real boolean true (not the string 'true').
        expect( zodSchema[ 'verbose' ].parse( undefined ) ).toBe( true )
    } )


    it( 'leaves an already-valid constraint-first order unchanged', () => {
        const route = {
            'method': 'GET',
            'description': 'Test route',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'page', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'number()', 'options': [ 'min(1)', 'max(100)' ] }
                }
            ],
            'tests': []
        }

        const zodSchema = ZodBuilder.getZodSchema( { route } )

        expect( zodSchema[ 'page' ].safeParse( 50 )[ 'success' ] ).toBe( true )
        expect( zodSchema[ 'page' ].safeParse( 0 )[ 'success' ] ).toBe( false )
        expect( zodSchema[ 'page' ].safeParse( 101 )[ 'success' ] ).toBe( false )
    } )
} )
