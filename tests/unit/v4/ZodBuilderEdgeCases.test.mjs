import { describe, it, expect } from '@jest/globals'

import { ZodBuilder } from '../../../src/v4/task/ZodBuilder.mjs'


const buildRoute = ( { key, primitive, options = [] } ) => {
    const route = {
        'method': 'GET',
        'description': 'Edge case test route',
        'path': '/test',
        'parameters': [
            {
                'position': { 'key': key, 'value': '{{USER_PARAM}}', 'location': 'query' },
                'z': { 'primitive': primitive, 'options': options }
            }
        ],
        'tests': []
    }

    return route
}


describe( 'ZodBuilder edge cases — unknown primitive', () => {
    it( 'falls back to z.string for an unrecognized primitive type', () => {
        const route = buildRoute( { 'key': 'myParam', 'primitive': 'unknown()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'myParam' )

        const validResult = schema[ 'myParam' ].safeParse( 'hello' )
        expect( validResult[ 'success' ] ).toBe( true )

        const invalidResult = schema[ 'myParam' ].safeParse( 123 )
        expect( invalidResult[ 'success' ] ).toBe( false )
    } )


    it( 'falls back to z.string for a primitive with spaces only', () => {
        const route = buildRoute( { 'key': 'spacey', 'primitive': 'notAType()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'spacey' )

        const result = schema[ 'spacey' ].safeParse( 'anything' )
        expect( result[ 'success' ] ).toBe( true )
    } )


    it( 'falls back to z.string for a misspelled primitive', () => {
        const route = buildRoute( { 'key': 'typo', 'primitive': 'strnig()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'typo' )

        const result = schema[ 'typo' ].safeParse( 'test' )
        expect( result[ 'success' ] ).toBe( true )
    } )
} )


describe( 'ZodBuilder edge cases — malformed enum', () => {
    it( 'throws for enum with missing closing parenthesis', () => {
        const route = buildRoute( { 'key': 'broken', 'primitive': 'enum(a,b', 'options': [] } )

        expect( () => {
            ZodBuilder.getZodSchema( { route } )
        } ).toThrow( 'Invalid enum type' )
    } )


    it( 'falls back to z.string when enum prefix does not match', () => {
        const route = buildRoute( { 'key': 'broken', 'primitive': 'enum)malformed', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'broken' )

        const result = schema[ 'broken' ].safeParse( 'fallback' )
        expect( result[ 'success' ] ).toBe( true )
    } )


    it( 'creates valid enum from well-formed enum with trailing spaces', () => {
        const route = buildRoute( { 'key': 'choice', 'primitive': 'enum( x , y , z )', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'choice' )

        const result = schema[ 'choice' ].safeParse( 'y' )
        expect( result[ 'success' ] ).toBe( true )
    } )
} )


describe( 'ZodBuilder edge cases — unknown option', () => {
    it( 'ignores an unrecognized option and returns the interface unchanged', () => {
        const route = buildRoute( { 'key': 'param', 'primitive': 'string()', 'options': [ 'unknownOpt(5)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'param' )

        const result = schema[ 'param' ].safeParse( 'hello' )
        expect( result[ 'success' ] ).toBe( true )
    } )


    it( 'ignores multiple unrecognized options', () => {
        const route = buildRoute( {
            'key': 'param',
            'primitive': 'string()',
            'options': [ 'foo(bar)', 'baz(42)', 'nope()' ]
        } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'param' )

        const result = schema[ 'param' ].safeParse( 'anything' )
        expect( result[ 'success' ] ).toBe( true )
    } )


    it( 'processes known options and ignores unknown ones in the same list', () => {
        const route = buildRoute( {
            'key': 'mixed',
            'primitive': 'string()',
            'options': [ 'unknownOpt(5)', 'optional()', 'anotherFake(xyz)' ]
        } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'mixed' )

        const undefinedResult = schema[ 'mixed' ].safeParse( undefined )
        expect( undefinedResult[ 'success' ] ).toBe( true )

        const stringResult = schema[ 'mixed' ].safeParse( 'value' )
        expect( stringResult[ 'success' ] ).toBe( true )
    } )
} )


describe( 'ZodBuilder edge cases — length option (int parsing)', () => {
    it( 'applies length constraint to a string parameter', () => {
        const route = buildRoute( { 'key': 'code', 'primitive': 'string()', 'options': [ 'length(5)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'code' )

        const validResult = schema[ 'code' ].safeParse( 'abcde' )
        expect( validResult[ 'success' ] ).toBe( true )

        const tooShort = schema[ 'code' ].safeParse( 'abc' )
        expect( tooShort[ 'success' ] ).toBe( false )

        const tooLong = schema[ 'code' ].safeParse( 'abcdefgh' )
        expect( tooLong[ 'success' ] ).toBe( false )
    } )


    it( 'parses length as integer, truncating decimal values', () => {
        const route = buildRoute( { 'key': 'fixed', 'primitive': 'string()', 'options': [ 'length(3)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'fixed' )

        const exactMatch = schema[ 'fixed' ].safeParse( 'abc' )
        expect( exactMatch[ 'success' ] ).toBe( true )

        const wrongLength = schema[ 'fixed' ].safeParse( 'ab' )
        expect( wrongLength[ 'success' ] ).toBe( false )
    } )


    it( 'combines length with other string options', () => {
        const route = buildRoute( {
            'key': 'token',
            'primitive': 'string()',
            'options': [ 'length(10)', 'regex(^[a-zA-Z0-9]+$)' ]
        } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'token' )

        const validResult = schema[ 'token' ].safeParse( 'abcdef1234' )
        expect( validResult[ 'success' ] ).toBe( true )

        const wrongLength = schema[ 'token' ].safeParse( 'abc' )
        expect( wrongLength[ 'success' ] ).toBe( false )

        const invalidChars = schema[ 'token' ].safeParse( 'abc!!def12' )
        expect( invalidChars[ 'success' ] ).toBe( false )
    } )
} )


describe( 'ZodBuilder edge cases — boolean primitive', () => {
    it( 'creates a boolean schema that accepts true and false', () => {
        const route = buildRoute( { 'key': 'flag', 'primitive': 'boolean()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'flag' )

        const trueResult = schema[ 'flag' ].safeParse( true )
        expect( trueResult[ 'success' ] ).toBe( true )

        const falseResult = schema[ 'flag' ].safeParse( false )
        expect( falseResult[ 'success' ] ).toBe( true )
    } )


    it( 'rejects non-boolean values on a boolean schema', () => {
        const route = buildRoute( { 'key': 'flag', 'primitive': 'boolean()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const stringResult = schema[ 'flag' ].safeParse( 'true' )
        expect( stringResult[ 'success' ] ).toBe( false )

        const numberResult = schema[ 'flag' ].safeParse( 1 )
        expect( numberResult[ 'success' ] ).toBe( false )
    } )


    it( 'handles boolean with optional option', () => {
        const route = buildRoute( { 'key': 'debug', 'primitive': 'boolean()', 'options': [ 'optional()' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'debug' )

        const undefinedResult = schema[ 'debug' ].safeParse( undefined )
        expect( undefinedResult[ 'success' ] ).toBe( true )

        const boolResult = schema[ 'debug' ].safeParse( false )
        expect( boolResult[ 'success' ] ).toBe( true )
    } )
} )


describe( 'ZodBuilder edge cases — object primitive', () => {
    it( 'creates an object schema that accepts empty objects', () => {
        const route = buildRoute( { 'key': 'metadata', 'primitive': 'object()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'metadata' )

        const validResult = schema[ 'metadata' ].safeParse( {} )
        expect( validResult[ 'success' ] ).toBe( true )
    } )


    it( 'rejects non-object values on an object schema', () => {
        const route = buildRoute( { 'key': 'metadata', 'primitive': 'object()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const stringResult = schema[ 'metadata' ].safeParse( 'not an object' )
        expect( stringResult[ 'success' ] ).toBe( false )

        const numberResult = schema[ 'metadata' ].safeParse( 42 )
        expect( numberResult[ 'success' ] ).toBe( false )
    } )


    it( 'handles object with optional option', () => {
        const route = buildRoute( { 'key': 'config', 'primitive': 'object()', 'options': [ 'optional()' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'config' )

        const undefinedResult = schema[ 'config' ].safeParse( undefined )
        expect( undefinedResult[ 'success' ] ).toBe( true )
    } )
} )


describe( 'ZodBuilder edge cases — array primitive', () => {
    it( 'creates an array schema that accepts arrays of strings', () => {
        const route = buildRoute( { 'key': 'tags', 'primitive': 'array()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'tags' )

        const validResult = schema[ 'tags' ].safeParse( [ 'a', 'b', 'c' ] )
        expect( validResult[ 'success' ] ).toBe( true )

        const emptyResult = schema[ 'tags' ].safeParse( [] )
        expect( emptyResult[ 'success' ] ).toBe( true )
    } )


    it( 'rejects non-array values on an array schema', () => {
        const route = buildRoute( { 'key': 'ids', 'primitive': 'array()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const stringResult = schema[ 'ids' ].safeParse( 'not-an-array' )
        expect( stringResult[ 'success' ] ).toBe( false )

        const numberResult = schema[ 'ids' ].safeParse( 123 )
        expect( numberResult[ 'success' ] ).toBe( false )
    } )


    it( 'rejects arrays with non-string elements', () => {
        const route = buildRoute( { 'key': 'items', 'primitive': 'array()', 'options': [] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const numberArray = schema[ 'items' ].safeParse( [ 1, 2, 3 ] )
        expect( numberArray[ 'success' ] ).toBe( false )
    } )


    it( 'handles array with optional option', () => {
        const route = buildRoute( { 'key': 'filters', 'primitive': 'array()', 'options': [ 'optional()' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'filters' )

        const undefinedResult = schema[ 'filters' ].safeParse( undefined )
        expect( undefinedResult[ 'success' ] ).toBe( true )

        const arrayResult = schema[ 'filters' ].safeParse( [ 'active' ] )
        expect( arrayResult[ 'success' ] ).toBe( true )
    } )
} )


describe( 'ZodBuilder edge cases — number with min/max validation', () => {
    it( 'rejects numbers above max', () => {
        const route = buildRoute( { 'key': 'score', 'primitive': 'number()', 'options': [ 'min(1)', 'max(100)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const aboveMax = schema[ 'score' ].safeParse( 101 )
        expect( aboveMax[ 'success' ] ).toBe( false )
    } )


    it( 'rejects numbers below min', () => {
        const route = buildRoute( { 'key': 'score', 'primitive': 'number()', 'options': [ 'min(1)', 'max(100)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const belowMin = schema[ 'score' ].safeParse( 0 )
        expect( belowMin[ 'success' ] ).toBe( false )
    } )


    it( 'accepts numbers at exact boundary values', () => {
        const route = buildRoute( { 'key': 'score', 'primitive': 'number()', 'options': [ 'min(1)', 'max(100)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const atMin = schema[ 'score' ].safeParse( 1 )
        expect( atMin[ 'success' ] ).toBe( true )

        const atMax = schema[ 'score' ].safeParse( 100 )
        expect( atMax[ 'success' ] ).toBe( true )
    } )


    it( 'handles float min/max values', () => {
        const route = buildRoute( { 'key': 'rate', 'primitive': 'number()', 'options': [ 'min(0.01)', 'max(99.99)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const validFloat = schema[ 'rate' ].safeParse( 50.5 )
        expect( validFloat[ 'success' ] ).toBe( true )

        const belowMin = schema[ 'rate' ].safeParse( 0.001 )
        expect( belowMin[ 'success' ] ).toBe( false )
    } )
} )


describe( 'ZodBuilder edge cases — multiple parameters', () => {
    it( 'handles mixed primitives in the same route', () => {
        const route = {
            'method': 'GET',
            'description': 'Multi-param edge case',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'name', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'string()', 'options': [ 'length(5)' ] }
                },
                {
                    'position': { 'key': 'active', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'boolean()', 'options': [] }
                },
                {
                    'position': { 'key': 'tags', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'array()', 'options': [ 'optional()' ] }
                },
                {
                    'position': { 'key': 'weird', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'banana()', 'options': [] }
                }
            ],
            'tests': []
        }

        const schema = ZodBuilder.getZodSchema( { route } )

        expect( Object.keys( schema ).length ).toBe( 4 )

        const nameValid = schema[ 'name' ].safeParse( 'abcde' )
        expect( nameValid[ 'success' ] ).toBe( true )

        const nameInvalid = schema[ 'name' ].safeParse( 'ab' )
        expect( nameInvalid[ 'success' ] ).toBe( false )

        const boolValid = schema[ 'active' ].safeParse( true )
        expect( boolValid[ 'success' ] ).toBe( true )

        const tagsUndefined = schema[ 'tags' ].safeParse( undefined )
        expect( tagsUndefined[ 'success' ] ).toBe( true )

        const weirdFallback = schema[ 'weird' ].safeParse( 'fallback string' )
        expect( weirdFallback[ 'success' ] ).toBe( true )
    } )
} )


describe( 'ZodBuilder edge cases — parameter filtering', () => {
    it( 'skips parameters where z exists but primitive is empty string', () => {
        const route = {
            'method': 'GET',
            'description': 'Filter test',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'missing', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': '', 'options': [] }
                },
                {
                    'position': { 'key': 'valid', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': 'string()', 'options': [] }
                }
            ],
            'tests': []
        }

        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).not.toHaveProperty( 'missing' )
        expect( schema ).toHaveProperty( 'valid' )
    } )


    it( 'skips parameters where z exists but primitive is null', () => {
        const route = {
            'method': 'GET',
            'description': 'Filter test',
            'path': '/test',
            'parameters': [
                {
                    'position': { 'key': 'nullPrim', 'value': '{{USER_PARAM}}', 'location': 'query' },
                    'z': { 'primitive': null, 'options': [] }
                }
            ],
            'tests': []
        }

        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).not.toHaveProperty( 'nullPrim' )
    } )
} )


describe( 'ZodBuilder edge cases — default option on string', () => {
    it( 'applies default value to a string parameter', () => {
        const route = buildRoute( { 'key': 'sort', 'primitive': 'string()', 'options': [ 'default(asc)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        expect( schema ).toHaveProperty( 'sort' )

        const parsed = schema[ 'sort' ].parse( undefined )
        expect( parsed ).toBe( 'asc' )
    } )


    it( 'allows overriding the default value', () => {
        const route = buildRoute( { 'key': 'sort', 'primitive': 'string()', 'options': [ 'default(asc)' ] } )
        const schema = ZodBuilder.getZodSchema( { route } )

        const parsed = schema[ 'sort' ].parse( 'desc' )
        expect( parsed ).toBe( 'desc' )
    } )
} )
