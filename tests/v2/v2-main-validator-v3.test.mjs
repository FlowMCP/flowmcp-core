import { describe, test, expect } from '@jest/globals'
import { MainValidator } from '../../src/v2/task/MainValidator.mjs'


const validV3Main = {
    namespace: 'test',
    name: 'Test',
    description: 'A v3 test schema.',
    version: '3.0.0',
    root: 'https://api.example.com',
    tools: {
        getStatus: {
            method: 'GET',
            path: '/status',
            description: 'Returns status.',
            parameters: [],
            tests: [
                { _description: 'Test 1' },
                { _description: 'Test 2' },
                { _description: 'Test 3' }
            ]
        }
    }
}

const validResource = {
    source: 'sqlite',
    description: 'Verified contracts database.',
    database: './data/contracts.db',
    queries: {
        getByAddress: {
            sql: 'SELECT * FROM contracts WHERE address = ?',
            parameters: [],
            output: { mimeType: 'application/json', schema: { type: 'object' } }
        }
    }
}

const validSkill = {
    file: './skills/contract-audit.mjs'
}


describe( 'MainValidator v3', () => {
    describe( 'version acceptance', () => {
        test( 'accepts version 3.0.0', () => {
            const { status, messages } = MainValidator
                .validate( { main: validV3Main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'accepts version 3.1.0', () => {
            const main = { ...validV3Main, version: '3.1.0' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'still accepts version 2.0.0 with routes key', () => {
            const main = {
                namespace: 'test',
                name: 'Test',
                description: 'A v2 test schema.',
                version: '2.0.0',
                root: 'https://api.example.com',
                routes: {
                    getStatus: {
                        method: 'GET',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: []
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'rejects version 1.0.0', () => {
            const main = { ...validV3Main, version: '1.0.0' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasVersionError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.version' )

                    return match
                } )

            expect( hasVersionError ).toBe( true )
        } )


        test( 'rejects version 4.0.0', () => {
            const main = { ...validV3Main, version: '4.0.0' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasVersionError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.version' )

                    return match
                } )

            expect( hasVersionError ).toBe( true )
        } )
    } )


    describe( 'tools key validation', () => {
        test( 'validates tools the same way as routes', () => {
            const main = {
                ...validV3Main,
                tools: {
                    getStatus: {
                        method: 'PATCH',
                        path: '/status',
                        description: 'Returns status.',
                        parameters: []
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasMethodError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'method' ) && msg.includes( 'GET, POST, PUT, DELETE' )

                    return match
                } )

            expect( hasMethodError ).toBe( true )
        } )


        test( 'fails when more than 8 tools', () => {
            const tools = {}
            const toolNames = [ 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9' ]
            toolNames
                .forEach( ( name ) => {
                    tools[ name ] = {
                        method: 'GET',
                        path: `/${name}`,
                        description: `Tool ${name}`,
                        parameters: []
                    }
                } )

            const main = { ...validV3Main, tools }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasToolError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Maximum 8 tools' )

                    return match
                } )

            expect( hasToolError ).toBe( true )
        } )
    } )


    describe( 'resources validation', () => {
        test( 'passes valid resources section', () => {
            const main = {
                ...validV3Main,
                resources: {
                    verifiedContracts: validResource
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails when resources is not a plain object', () => {
            const main = { ...validV3Main, resources: 'invalid' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasResourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.resources' ) && msg.includes( 'plain object' )

                    return match
                } )

            expect( hasResourceError ).toBe( true )
        } )


        test( 'fails when resources is an array', () => {
            const main = { ...validV3Main, resources: [ validResource ] }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasResourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.resources' ) && msg.includes( 'plain object' )

                    return match
                } )

            expect( hasResourceError ).toBe( true )
        } )


        test( 'fails when more than 2 resources', () => {
            const main = {
                ...validV3Main,
                resources: {
                    r1: validResource,
                    r2: validResource,
                    r3: validResource
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasMaxError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Maximum 2 resources' )

                    return match
                } )

            expect( hasMaxError ).toBe( true )
        } )


        test( 'fails when resource source is not sqlite', () => {
            const main = {
                ...validV3Main,
                resources: {
                    myResource: {
                        ...validResource,
                        source: 'postgres'
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasSourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'source' ) && msg.includes( 'sqlite' )

                    return match
                } )

            expect( hasSourceError ).toBe( true )
        } )


        test( 'fails when resource source is missing', () => {
            const { source, ...resourceWithoutSource } = validResource
            const main = {
                ...validV3Main,
                resources: {
                    myResource: resourceWithoutSource
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasSourceError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'source' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasSourceError ).toBe( true )
        } )


        test( 'fails when resource database does not end with .db', () => {
            const main = {
                ...validV3Main,
                resources: {
                    myResource: {
                        ...validResource,
                        database: './data/contracts.sqlite'
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasDbError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'database' ) && msg.includes( '.db' )

                    return match
                } )

            expect( hasDbError ).toBe( true )
        } )


        test( 'fails when resource database is missing', () => {
            const { database, ...resourceWithoutDb } = validResource
            const main = {
                ...validV3Main,
                resources: {
                    myResource: resourceWithoutDb
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasDbError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'database' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasDbError ).toBe( true )
        } )


        test( 'fails when resource description is missing', () => {
            const { description, ...resourceWithoutDesc } = validResource
            const main = {
                ...validV3Main,
                resources: {
                    myResource: resourceWithoutDesc
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasDescError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'description' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasDescError ).toBe( true )
        } )


        test( 'fails when resource queries is missing', () => {
            const { queries, ...resourceWithoutQueries } = validResource
            const main = {
                ...validV3Main,
                resources: {
                    myResource: resourceWithoutQueries
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasQueriesError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'queries' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasQueriesError ).toBe( true )
        } )


        test( 'fails when resource queries is not a plain object', () => {
            const main = {
                ...validV3Main,
                resources: {
                    myResource: {
                        ...validResource,
                        queries: 'invalid'
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasQueriesError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'queries' ) && msg.includes( 'plain object' )

                    return match
                } )

            expect( hasQueriesError ).toBe( true )
        } )


        test( 'fails when more than 4 queries', () => {
            const main = {
                ...validV3Main,
                resources: {
                    myResource: {
                        ...validResource,
                        queries: {
                            q1: {}, q2: {}, q3: {}, q4: {}, q5: {}
                        }
                    }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasMaxError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Maximum 4 queries' )

                    return match
                } )

            expect( hasMaxError ).toBe( true )
        } )
    } )


    describe( 'skills validation', () => {
        test( 'passes valid skills section', () => {
            const main = {
                ...validV3Main,
                skills: {
                    'contract-audit': validSkill
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails when skills is not a plain object', () => {
            const main = { ...validV3Main, skills: 'invalid' }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasSkillError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.skills' ) && msg.includes( 'plain object' )

                    return match
                } )

            expect( hasSkillError ).toBe( true )
        } )


        test( 'fails when skills is an array', () => {
            const main = { ...validV3Main, skills: [ validSkill ] }
            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasSkillError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'main.skills' ) && msg.includes( 'plain object' )

                    return match
                } )

            expect( hasSkillError ).toBe( true )
        } )


        test( 'fails when more than 4 skills', () => {
            const main = {
                ...validV3Main,
                skills: {
                    's1': validSkill,
                    's2': validSkill,
                    's3': validSkill,
                    's4': validSkill,
                    's5': validSkill
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasMaxError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'Maximum 4 skills' )

                    return match
                } )

            expect( hasMaxError ).toBe( true )
        } )


        test( 'fails when skill file is missing', () => {
            const main = {
                ...validV3Main,
                skills: {
                    'my-skill': {}
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasFileError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'file' ) && msg.includes( 'Missing' )

                    return match
                } )

            expect( hasFileError ).toBe( true )
        } )


        test( 'fails when skill file does not end with .mjs', () => {
            const main = {
                ...validV3Main,
                skills: {
                    'my-skill': { file: './skills/audit.js' }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasFileError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'file' ) && msg.includes( '.mjs' )

                    return match
                } )

            expect( hasFileError ).toBe( true )
        } )


        test( 'fails when skill file is not a string', () => {
            const main = {
                ...validV3Main,
                skills: {
                    'my-skill': { file: 123 }
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasFileError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'file' ) && msg.includes( 'string' )

                    return match
                } )

            expect( hasFileError ).toBe( true )
        } )
    } )


    describe( 'E1 — zero tools with other primitives', () => {
        test( 'passes with 0 tools but resources present', () => {
            const main = {
                namespace: 'test',
                name: 'Test',
                description: 'Resource-only schema.',
                version: '3.0.0',
                root: 'https://api.example.com',
                resources: {
                    verifiedContracts: validResource
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'passes with 0 tools but skills present', () => {
            const main = {
                namespace: 'test',
                name: 'Test',
                description: 'Skill-only schema.',
                version: '3.0.0',
                root: 'https://api.example.com',
                skills: {
                    'contract-audit': validSkill
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )


        test( 'fails with 0 tools, 0 resources, 0 skills', () => {
            const main = {
                namespace: 'test',
                name: 'Test',
                description: 'Empty schema.',
                version: '3.0.0',
                root: 'https://api.example.com'
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( false )

            const hasPrimitiveError = messages
                .some( ( msg ) => {
                    const match = msg.includes( 'at least one primitive' )

                    return match
                } )

            expect( hasPrimitiveError ).toBe( true )
        } )


        test( 'passes with tools + resources + skills together', () => {
            const main = {
                ...validV3Main,
                resources: {
                    verifiedContracts: validResource
                },
                skills: {
                    'contract-audit': validSkill
                }
            }

            const { status, messages } = MainValidator
                .validate( { main } )

            expect( status ).toBe( true )
            expect( messages ).toEqual( [] )
        } )
    } )
} )
