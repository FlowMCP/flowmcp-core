import { FlowMCP } from '../../../src/index.mjs'
import { mockSchemas } from '../helpers/mock-schemas.mjs'


describe( 'FlowMCP.filterArrayOfSchemas: Case-Insensitive Behavior', () => {
    let originalWarn
    
    beforeEach( () => {
        originalWarn = console.warn
        console.warn = () => {} // Suppress console.warn output
    } )
    
    afterEach( () => {
        console.warn = originalWarn
    } )

    it( 'handles case-insensitive namespace filtering - includeNamespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'LUKSONETWORK', 'COINGECKO' ],
            excludeNamespaces: [],
            activateTags: []
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const namespaces = filteredArrayOfSchemas
            .map( schema => schema.namespace )
        
        expect( namespaces ).toContain( 'luksoNetwork' )
        expect( namespaces ).toContain( 'coingecko' )
    } )


    it( 'handles case-insensitive namespace filtering - excludeNamespaces', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [ 'LUKSONETWORK', 'COINGECKO' ],
            activateTags: []
        } )

        const namespaces = filteredArrayOfSchemas
            .map( schema => schema.namespace )
        
        expect( namespaces ).not.toContain( 'luksoNetwork' )
        expect( namespaces ).not.toContain( 'coingecko' )
        expect( namespaces ).toContain( 'testNamespace' )
    } )


    it( 'handles case-insensitive tag filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN', 'testtag' ]
        } )

        expect( filteredArrayOfSchemas.length ).toBeGreaterThan( 0 )
        
        filteredArrayOfSchemas
            .forEach( schema => {
                const hasBlockchainTag = schema.tags
                    .some( tag => tag.toLowerCase() === 'blockchain' )
                const hasTestTag = schema.tags
                    .some( tag => tag.toLowerCase() === 'testtag' )
                
                expect( hasBlockchainTag || hasTestTag ).toBe( true )
            } )
    } )


    it( 'handles case-insensitive route filtering - namespace part', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'LUKSONETWORK.getBlocks', 'COINGECKO.getPrice' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        const coingeckoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'coingecko' )
        
        expect( luksoSchema ).toBeDefined()
        expect( coingeckoSchema ).toBeDefined()
        
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBlocks' ] )
        expect( Object.keys( coingeckoSchema.routes ) ).toEqual( [ 'getPrice' ] )
    } )


    it( 'handles case-insensitive route filtering - route part', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'luksoNetwork.GETBLOCKS', 'coingecko.GETPRICE' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        const coingeckoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'coingecko' )
        
        expect( Object.keys( luksoSchema.routes ) ).toEqual( [ 'getBlocks' ] )
        expect( Object.keys( coingeckoSchema.routes ) ).toEqual( [ 'getPrice' ] )
    } )


    it( 'handles case-insensitive exclude route filtering', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [ 'LUKSONETWORK.!GETBLOCKS', 'coingecko.!GETPRICE' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        const coingeckoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'coingecko' )
        
        expect( Object.keys( luksoSchema.routes ) ).not.toContain( 'getBlocks' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getTransactions' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBalance' )
        
        expect( Object.keys( coingeckoSchema.routes ) ).not.toContain( 'getPrice' )
        expect( Object.keys( coingeckoSchema.routes ) ).toContain( 'getMarkets' )
    } )


    it( 'preserves original case in returned schemas', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'LUKSONETWORK' ],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        
        const schema = filteredArrayOfSchemas[ 0 ]
        
        // Original case should be preserved
        expect( schema.namespace ).toBe( 'luksoNetwork' )
        expect( schema.tags ).toContain( 'blockchain' )
        expect( schema.tags ).toContain( 'lukso' )
        expect( Object.keys( schema.routes ) ).toContain( 'getBlocks' )
        expect( Object.keys( schema.routes ) ).toContain( 'getBalance' )
    } )


    it( 'combines case-insensitive filtering with multiple filter types', () => {
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: mockSchemas,
            includeNamespaces: [ 'LUKSONETWORK' ],
            excludeNamespaces: [],
            activateTags: [ 'BLOCKCHAIN', 'luksonetwork.!GETTRANSACTIONS' ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        
        const luksoSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'luksoNetwork' )
        // Only luksoNetwork should remain after filtering
        
        expect( luksoSchema ).toBeDefined()
        
        // luksoNetwork should have blockchain tag AND exclude getTransactions
        expect( luksoSchema.tags ).toContain( 'blockchain' )
        expect( Object.keys( luksoSchema.routes ) ).not.toContain( 'getTransactions' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBlocks' )
        expect( Object.keys( luksoSchema.routes ) ).toContain( 'getBalance' )
    } )


    it( 'handles camelCase route names correctly without double toLowerCase', () => {
        // This test specifically checks the bug where route names were being
        // converted to lowercase twice, causing "Route not found" errors
        const testSchemas = [
            {
                'namespace': 'dexscreener',
                'flowmcp': 'v1',
                'tags': [ 'defi' ],
                'routes': {
                    'getLatestPairs': {},
                    'getPairsByChain': {},
                    'getSpecificPair': {}
                },
                'headers': {},
                'requiredServerParams': []
            },
            {
                'namespace': 'etherscan',
                'flowmcp': 'v1',
                'tags': [ 'blockchain' ],
                'routes': {
                    'getGasOracle': {},
                    'estimateGasCost': {},
                    'getAvailableChains': {}
                },
                'headers': {},
                'requiredServerParams': []
            }
        ]

        // Test with exact camelCase as would come from config
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: testSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [
                'dexscreener.getLatestPairs',
                'dexscreener.getPairsByChain',
                'etherscan.getGasOracle',
                'etherscan.estimateGasCost'
            ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 2 )
        
        const dexSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'dexscreener' )
        const etherscanSchema = filteredArrayOfSchemas
            .find( schema => schema.namespace === 'etherscan' )
        
        expect( dexSchema ).toBeDefined()
        expect( etherscanSchema ).toBeDefined()
        
        // Should preserve original camelCase route names
        expect( Object.keys( dexSchema.routes ) ).toContain( 'getLatestPairs' )
        expect( Object.keys( dexSchema.routes ) ).toContain( 'getPairsByChain' )
        expect( Object.keys( dexSchema.routes ) ).not.toContain( 'getSpecificPair' )
        
        expect( Object.keys( etherscanSchema.routes ) ).toContain( 'getGasOracle' )
        expect( Object.keys( etherscanSchema.routes ) ).toContain( 'estimateGasCost' )
        expect( Object.keys( etherscanSchema.routes ) ).not.toContain( 'getAvailableChains' )
    } )


    it( 'handles mixed case variations in activateTags', () => {
        const testSchemas = [
            {
                'namespace': 'blocknative',
                'flowmcp': 'v1',
                'tags': [ 'gas' ],
                'routes': {
                    'getGasPrices': {},
                    'getMempool': {}
                },
                'headers': {},
                'requiredServerParams': []
            }
        ]

        // Test with various case combinations
        const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
            arrayOfSchemas: testSchemas,
            includeNamespaces: [],
            excludeNamespaces: [],
            activateTags: [
                'BLOCKNATIVE.getGasPrices',  // all caps namespace, camelCase route
                'blocknative.GETMEMPOOL'      // lowercase namespace, all caps route
            ]
        } )

        expect( filteredArrayOfSchemas ).toHaveLength( 1 )
        
        const blockNativeSchema = filteredArrayOfSchemas[ 0 ]
        
        // Both routes should be included despite case differences
        expect( Object.keys( blockNativeSchema.routes ) ).toContain( 'getGasPrices' )
        expect( Object.keys( blockNativeSchema.routes ) ).toContain( 'getMempool' )
    } )
} )