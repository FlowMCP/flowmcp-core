export const list = {
    meta: {
        name: 'evmChains',
        version: '1.0.0',
        description: 'EVM-compatible blockchain networks for testing.',
        fields: [
            { key: 'chainId', type: 'number', description: 'Chain ID', optional: false },
            { key: 'name', type: 'string', description: 'Chain name', optional: false },
            { key: 'mainnet', type: 'boolean', description: 'Is mainnet', optional: false },
            { key: 'etherscanAlias', type: 'string', description: 'Etherscan subdomain alias', optional: true }
        ]
    },
    entries: [
        { chainId: 1, name: 'Ethereum', mainnet: true, etherscanAlias: 'api' },
        { chainId: 137, name: 'Polygon', mainnet: true, etherscanAlias: 'api-polygon' },
        { chainId: 5, name: 'Goerli', mainnet: false, etherscanAlias: null }
    ]
}
