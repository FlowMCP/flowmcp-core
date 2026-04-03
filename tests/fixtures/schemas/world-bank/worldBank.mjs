export const main = {
    namespace: 'worldbank',
    name: 'WorldBank',
    description: 'Access World Bank development data — 17,000+ indicators for 260+ countries including GDP, population, poverty rates, and health statistics.',
    version: '3.0.0',
    docs: ['https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation'],
    tags: ['economics', 'development', 'statistics', 'countries', 'cacheTtlDaily'],
    root: 'https://api.worldbank.org',
    requiredServerParams: [],
    headers: {},
    tools: {
        getCountryIndicator: {
            method: 'GET',
            path: '/v2/country/:countryCode/indicator/:indicatorCode',
            description: 'Retrieve time series data for a specific indicator and country. Returns annual values with year range support.. Use getAllCountriesIndicator first to find valid IDs',
            parameters: [
                { position: { key: 'countryCode', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'indicatorCode', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'date', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } },
                { position: { key: 'mrv', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'min(1)', 'max(20)'] } },
                { position: { key: 'per_page', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(50)', 'min(1)', 'max(1000)'] } },
                { position: { key: 'format', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'Get US GDP (current USD) for 2020-2023', countryCode: 'US', indicatorCode: 'NY.GDP.MKTP.CD', date: '2020:2023' },
                { _description: 'Get Germany population — most recent 5 years', countryCode: 'DE', indicatorCode: 'SP.POP.TOTL', mrv: 5 },
                { _description: 'Get Brazil poverty headcount ratio', countryCode: 'BR', indicatorCode: 'SI.POV.DDAY', mrv: 3 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'array',
                    description: 'Two-element array: [0] pagination metadata, [1] array of data points',
                    items: {
                        oneOf: [
                            {
                                type: 'object',
                                description: 'Pagination metadata',
                                properties: {
                                    page: { type: 'number' },
                                    pages: { type: 'number' },
                                    per_page: { type: 'string' },
                                    total: { type: 'number' }
                                }
                            },
                            {
                                type: 'array',
                                description: 'Data entries',
                                items: {
                                    type: 'object',
                                    properties: {
                                        indicator: { type: 'object', properties: { id: { type: 'string' }, value: { type: 'string' } } },
                                        country: { type: 'object', properties: { id: { type: 'string' }, value: { type: 'string' } } },
                                        countryiso3code: { type: 'string' },
                                        date: { type: 'string', description: 'Year of measurement' },
                                        value: { type: 'number', description: 'Indicator value' },
                                        unit: { type: 'string' },
                                        obs_status: { type: 'string' },
                                        decimal: { type: 'number' }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        },
        getAllCountriesIndicator: {
            method: 'GET',
            path: '/v2/country/all/indicator/:indicatorCode',
            description: 'Retrieve indicator data for all countries. Returns global values for a given year range. Useful for cross-country comparisons.',
            parameters: [
                { position: { key: 'indicatorCode', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'date', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } },
                { position: { key: 'mrv', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'min(1)', 'max(5)'] } },
                { position: { key: 'per_page', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(50)', 'min(1)', 'max(1000)'] } },
                { position: { key: 'format', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'Get global population data for 2023', indicatorCode: 'SP.POP.TOTL', date: '2023', per_page: 50 },
                { _description: 'Get global GDP most recent year', indicatorCode: 'NY.GDP.MKTP.CD', mrv: 1, per_page: 100 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'array',
                    items: { type: 'object' }
                }
            }
        },
        listCountries: {
            method: 'GET',
            path: '/v2/country',
            description: 'List all countries and regions with metadata including income level, lending type, region, and capital city.. Use IDs from results in getAllCountriesIndicator',
            parameters: [
                { position: { key: 'incomeLevel', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'enum(LIC,LMC,UMC,HIC,MIC)', options: ['optional()'] } },
                { position: { key: 'region', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } },
                { position: { key: 'per_page', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(50)', 'min(1)', 'max(300)'] } },
                { position: { key: 'format', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'List all low income countries', incomeLevel: 'LIC', per_page: 100 },
                { _description: 'List all countries (first page)', per_page: 50 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'array',
                    items: {
                        oneOf: [
                            {
                                type: 'object',
                                properties: {
                                    page: { type: 'number' },
                                    pages: { type: 'number' },
                                    per_page: { type: 'number' },
                                    total: { type: 'number' }
                                }
                            },
                            {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string', description: 'ISO 2-letter country code' },
                                        iso2Code: { type: 'string' },
                                        name: { type: 'string' },
                                        region: { type: 'object', properties: { id: { type: 'string' }, value: { type: 'string' } } },
                                        adminregion: { type: 'object' },
                                        incomeLevel: { type: 'object', properties: { id: { type: 'string' }, value: { type: 'string' } } },
                                        lendingType: { type: 'object' },
                                        capitalCity: { type: 'string' },
                                        longitude: { type: 'string' },
                                        latitude: { type: 'string' }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        },
        getCountryDetails: {
            method: 'GET',
            path: '/v2/country/:countryCode',
            description: 'Get details for a specific country including region, income level, lending type, and capital city.',
            parameters: [
                { position: { key: 'countryCode', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'format', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'Get details for United States', countryCode: 'US' },
                { _description: 'Get details for Nigeria', countryCode: 'NG' }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'array',
                    items: { type: 'object' }
                }
            }
        },
        listIndicators: {
            method: 'GET',
            path: '/v2/indicator',
            description: 'List World Bank indicators with descriptions, source, and topic. Supports search by source or topic.. Use IDs from results in getCountryIndicator',
            parameters: [
                { position: { key: 'source', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()'] } },
                { position: { key: 'per_page', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(50)', 'min(1)', 'max(1000)'] } },
                { position: { key: 'page', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } },
                { position: { key: 'format', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'List first 50 indicators', per_page: 50 },
                { _description: 'List indicators from World Development Indicators source (source 2)', source: 2, per_page: 50 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'array',
                    items: {
                        oneOf: [
                            {
                                type: 'object',
                                properties: {
                                    page: { type: 'number' },
                                    pages: { type: 'number' },
                                    per_page: { type: 'number' },
                                    total: { type: 'number' }
                                }
                            },
                            {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string', description: 'Indicator code e.g. NY.GDP.MKTP.CD' },
                                        name: { type: 'string' },
                                        unit: { type: 'string' },
                                        source: { type: 'object', properties: { id: { type: 'string' }, value: { type: 'string' } } },
                                        sourceNote: { type: 'string' },
                                        sourceOrganization: { type: 'string' },
                                        topics: { type: 'array' }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        },
        getIndicatorDetails: {
            method: 'GET',
            path: '/v2/indicator/:indicatorCode',
            description: 'Get metadata for a specific indicator including name, description, source, and topic.',
            parameters: [
                { position: { key: 'indicatorCode', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'format', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'Get details for GDP indicator', indicatorCode: 'NY.GDP.MKTP.CD' },
                { _description: 'Get details for population total indicator', indicatorCode: 'SP.POP.TOTL' }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'array',
                    items: { type: 'object' }
                }
            }
        }
    }
}
