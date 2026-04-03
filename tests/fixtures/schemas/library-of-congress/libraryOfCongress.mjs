export const main = {
    namespace: 'libraryofcongress',
    name: 'Library of Congress',
    description: 'Search and retrieve items from the Library of Congress digital collections — books, photos, maps, manuscripts, audio, and video across 170M+ catalog records.',
    version: '3.0.0',
    docs: ['https://www.loc.gov/apis/json-and-yaml/'],
    tags: ['library', 'books', 'archives', 'government', 'history', 'cacheTtlDaily'],
    root: 'https://www.loc.gov',
    tools: {
        searchAll: {
            method: 'GET',
            path: '/search/',
            description: 'Search across all Library of Congress digital collections. Returns items, newspapers, photos, manuscripts, maps, and more with faceted filtering. The fa parameter uses format "facet-name:value" with + for spaces (e.g. "original-format:photo,+print,+drawing").',
            parameters: [
                { position: { key: 'q', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'fo', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'c', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(25)', 'min(1)', 'max(150)'] } },
                { position: { key: 'sp', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } },
                { position: { key: 'fa', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } },
                { position: { key: 'sb', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'enum(date,date_desc,title_s,title_s_desc)', options: ['optional()'] } }
            ],
            tests: [
                { _description: 'Search for Shakespeare across all collections', q: 'shakespeare', c: 5 },
                { _description: 'Search for civil war photos', q: 'civil war', fa: 'original-format:photo,+print,+drawing', c: 5 },
                { _description: 'Search with date sort', q: 'moon landing', sb: 'date_desc', c: 5 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated search results with faceted filtering',
                    properties: {
                        pagination: {
                            type: 'object',
                            description: 'Pagination metadata for navigating result pages',
                            properties: {
                                current: { type: 'number', description: 'Current page number (1-based)' },
                                from: { type: 'number', description: 'Index of first item on this page' },
                                to: { type: 'number', description: 'Index of last item on this page' },
                                of: { type: 'number', description: 'Total items across all pages' },
                                total: { type: 'number', description: 'Total pages available' },
                                perpage: { type: 'number', description: 'Items per page' },
                                next: { type: 'string', description: 'URL to the next page of results, or null' },
                                previous: { type: 'string', description: 'URL to the previous page, or null' }
                            }
                        },
                        results: {
                            type: 'array',
                            description: 'Array of catalog items matching the search',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique item identifier (LOC URL path)' },
                                    title: { type: 'string', description: 'Item title' },
                                    date: { type: 'string', description: 'Publication or creation date' },
                                    description: { type: 'array', description: 'Item description paragraphs', items: { type: 'string' } },
                                    contributor: { type: 'array', description: 'Authors, creators, or contributors', items: { type: 'string' } },
                                    subject: { type: 'array', description: 'Subject headings and topics', items: { type: 'string' } },
                                    language: { type: 'array', description: 'Language(s) of the item', items: { type: 'string' } },
                                    digitized: { type: 'boolean', description: 'Whether a digital version is available' },
                                    image_url: { type: 'array', description: 'URLs to thumbnail/preview images', items: { type: 'string' } },
                                    location: { type: 'array', description: 'Geographic locations associated with the item', items: { type: 'string' } }
                                }
                            }
                        },
                        facets: { type: 'array', description: 'Available facet filters with counts, usable in the fa parameter' }
                    }
                }
            }
        },
        searchBooks: {
            method: 'GET',
            path: '/books/',
            description: 'Search specifically within the Library of Congress book collections. Filters results to book-format items only. Shares facet filter syntax with searchAll (fa parameter format: "facet:value").',
            parameters: [
                { position: { key: 'q', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'fo', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'c', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(25)', 'min(1)', 'max(150)'] } },
                { position: { key: 'sp', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } },
                { position: { key: 'fa', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } },
                { position: { key: 'sb', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'enum(date,date_desc,title_s,title_s_desc)', options: ['optional()'] } }
            ],
            tests: [
                { _description: 'Search for books about gatsby', q: 'gatsby', c: 5 },
                { _description: 'Search for English language books about astronomy', q: 'astronomy', fa: 'language:english', c: 5 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated book search results',
                    properties: {
                        pagination: { type: 'object', description: 'Pagination metadata (current, from, to, of, total, perpage, next, previous)' },
                        results: {
                            type: 'array',
                            description: 'Matching book items',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique item identifier (LOC URL path)' },
                                    title: { type: 'string', description: 'Book title' },
                                    date: { type: 'string', description: 'Publication date' },
                                    description: { type: 'array', description: 'Book description paragraphs', items: { type: 'string' } },
                                    contributor: { type: 'array', description: 'Authors and contributors', items: { type: 'string' } },
                                    subject: { type: 'array', description: 'Subject headings', items: { type: 'string' } },
                                    language: { type: 'array', description: 'Language(s)', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                }
            }
        },
        searchPhotos: {
            method: 'GET',
            path: '/photos/',
            description: 'Search within the Library of Congress photo, print, and drawing collections. Returns digitized image items with thumbnails.',
            parameters: [
                { position: { key: 'q', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'fo', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'c', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(25)', 'min(1)', 'max(150)'] } },
                { position: { key: 'sp', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } },
                { position: { key: 'fa', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } }
            ],
            tests: [
                { _description: 'Search for photos of Washington DC', q: 'washington dc', c: 5 },
                { _description: 'Search for historical bridge photos', q: 'bridges', fa: 'location:washington+d.c.', c: 5 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated photo search results',
                    properties: {
                        pagination: { type: 'object', description: 'Pagination metadata (current, from, to, of, total, perpage, next, previous)' },
                        results: {
                            type: 'array',
                            description: 'Matching photo, print, and drawing items',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique item identifier' },
                                    title: { type: 'string', description: 'Photo/print title' },
                                    date: { type: 'string', description: 'Creation or publication date' },
                                    description: { type: 'array', description: 'Item description', items: { type: 'string' } },
                                    image_url: { type: 'array', description: 'URLs to image files', items: { type: 'string' } },
                                    location: { type: 'array', description: 'Geographic locations depicted', items: { type: 'string' } },
                                    subject: { type: 'array', description: 'Subject headings', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                }
            }
        },
        searchMaps: {
            method: 'GET',
            path: '/maps/',
            description: 'Search within the Library of Congress map collections. Returns digitized maps, atlases, and geographic materials.',
            parameters: [
                { position: { key: 'q', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'fo', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'c', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(25)', 'min(1)', 'max(150)'] } },
                { position: { key: 'sp', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } },
                { position: { key: 'fa', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } }
            ],
            tests: [
                { _description: 'Search for maps of California', q: 'california', c: 5 },
                { _description: 'Search for Civil War era maps', q: 'civil war', c: 5 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated map search results',
                    properties: {
                        pagination: { type: 'object', description: 'Pagination metadata (current, from, to, of, total, perpage, next, previous)' },
                        results: {
                            type: 'array',
                            description: 'Matching map and atlas items',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique item identifier' },
                                    title: { type: 'string', description: 'Map title' },
                                    date: { type: 'string', description: 'Creation or publication date' },
                                    description: { type: 'array', description: 'Map description', items: { type: 'string' } },
                                    image_url: { type: 'array', description: 'URLs to map image files', items: { type: 'string' } },
                                    location: { type: 'array', description: 'Geographic area covered', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                }
            }
        },
        listCollections: {
            method: 'GET',
            path: '/collections/',
            description: 'List all digital collections available at the Library of Congress. Returns collection names, descriptions, item counts, and thumbnails. Collection slugs from results can be used in searchCollection.',
            parameters: [
                { position: { key: 'fo', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'c', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(25)', 'min(1)', 'max(150)'] } },
                { position: { key: 'sp', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } }
            ],
            tests: [
                { _description: 'List first 10 collections', c: 10 },
                { _description: 'List collections page 2', c: 10, sp: 2 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated list of LOC digital collections',
                    properties: {
                        pagination: { type: 'object', description: 'Pagination metadata (current, from, to, of, total, perpage, next, previous)' },
                        results: {
                            type: 'array',
                            description: 'Collection entries with slugs usable in searchCollection',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Collection URL path containing the slug for searchCollection' },
                                    title: { type: 'string', description: 'Collection name' },
                                    description: { type: 'array', description: 'Collection description', items: { type: 'string' } },
                                    count: { type: 'number', description: 'Number of items in this collection' },
                                    image_url: { type: 'array', description: 'Collection thumbnail images', items: { type: 'string' } },
                                    digitized: { type: 'boolean', description: 'Whether items are digitized' }
                                }
                            }
                        }
                    }
                }
            }
        },
        searchCollection: {
            method: 'GET',
            path: '/collections/:collectionSlug/',
            description: 'Search within a specific Library of Congress collection by its URL slug (obtainable from listCollections). Returns items from that collection matching the query.',
            parameters: [
                { position: { key: 'collectionSlug', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'q', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } },
                { position: { key: 'fo', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'c', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(25)', 'min(1)', 'max(150)'] } },
                { position: { key: 'sp', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } }
            ],
            tests: [
                { _description: 'Browse Abraham Lincoln Papers collection', collectionSlug: 'abraham-lincoln-papers', c: 5 },
                { _description: 'Search within baseball card collection', collectionSlug: 'baseball-cards', q: 'babe ruth', c: 5 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated results from a specific collection',
                    properties: {
                        pagination: { type: 'object', description: 'Pagination metadata (current, from, to, of, total, perpage, next, previous)' },
                        results: {
                            type: 'array',
                            description: 'Items from the specified collection',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique item identifier' },
                                    title: { type: 'string', description: 'Item title' },
                                    date: { type: 'string', description: 'Creation or publication date' },
                                    description: { type: 'array', description: 'Item description', items: { type: 'string' } },
                                    image_url: { type: 'array', description: 'URLs to images', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                }
            }
        },
        searchNewspapers: {
            method: 'GET',
            path: '/newspapers/',
            description: 'Search the Chronicling America digitized newspaper collection at the Library of Congress. Returns historic newspaper pages and issues.',
            parameters: [
                { position: { key: 'q', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'fo', value: 'json', location: 'query' }, z: { primitive: 'string()', options: [] } },
                { position: { key: 'c', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(25)', 'min(1)', 'max(150)'] } },
                { position: { key: 'sp', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'number()', options: ['optional()', 'default(1)', 'min(1)'] } },
                { position: { key: 'fa', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } }
            ],
            tests: [
                { _description: 'Search newspapers for titanic', q: 'titanic', c: 5 },
                { _description: 'Search newspapers about prohibition', q: 'prohibition', c: 5 }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated newspaper search results from Chronicling America',
                    properties: {
                        pagination: { type: 'object', description: 'Pagination metadata (current, from, to, of, total, perpage, next, previous)' },
                        results: {
                            type: 'array',
                            description: 'Matching newspaper pages and issues',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique item identifier' },
                                    title: { type: 'string', description: 'Newspaper title' },
                                    date: { type: 'string', description: 'Publication date' },
                                    description: { type: 'array', description: 'Issue description', items: { type: 'string' } },
                                    language: { type: 'array', description: 'Language(s)', items: { type: 'string' } },
                                    location: { type: 'array', description: 'Publication location', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
