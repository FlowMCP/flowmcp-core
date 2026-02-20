import { FlowMCP } from '../../../src/v1/index.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Input Validation', () => {

    it( 'throws error when arrayOfSchemas is empty', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [],
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'Missing or invalid arrayOfSchemas' )
    } )


    it( 'throws error when arrayOfSchemas is not an array', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: null,
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'Missing or invalid arrayOfSchemas' )
    } )


    it( 'throws error when includeNamespaces is not an array', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [
                    { namespace: 'test', tags: [], routes: {} }
                ],
                includeNamespaces: 'notAnArray',
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'includeNamespaces: Must be an array' )
    } )


    it( 'throws error when excludeNamespaces is not an array', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [
                    { namespace: 'test', tags: [], routes: {} }
                ],
                includeNamespaces: [],
                excludeNamespaces: 'notAnArray',
                activateTags: []
            } )
        } ).toThrow( 'excludeNamespaces: Must be an array' )
    } )


    it( 'throws error when activateTags is not an array', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [
                    { namespace: 'test', tags: [], routes: {} }
                ],
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: 'notAnArray'
            } )
        } ).toThrow( 'activateTags: Must be an array' )
    } )


    it( 'throws error when includeNamespaces contains empty strings', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [
                    { namespace: 'test', tags: [], routes: {} }
                ],
                includeNamespaces: [ 'valid', '', 'alsoValid' ],
                excludeNamespaces: [],
                activateTags: []
            } )
        } ).toThrow( 'includeNamespaces: Must be an array of non-empty strings' )
    } )


    it( 'throws error when activateTags contains empty strings', () => {
        expect( () => {
            FlowMCP.filterArrayOfSchemas( {
                arrayOfSchemas: [
                    { namespace: 'test', tags: [], routes: {} }
                ],
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: [ 'valid', '', 'alsoValid' ]
            } )
        } ).toThrow( 'activateTags: Must be an array of non-empty strings' )
    } )
} )