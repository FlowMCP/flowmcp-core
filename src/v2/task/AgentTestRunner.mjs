class AgentTestRunner {
    static validateTests( { tests } ) {
        const struct = { status: false, messages: [] }

        if( tests === undefined || tests === null ) {
            struct[ 'messages' ].push( 'tests: Missing value' )

            return struct
        }

        if( !Array.isArray( tests ) ) {
            struct[ 'messages' ].push( 'tests: Must be an array' )

            return struct
        }

        if( tests.length === 0 ) {
            struct[ 'messages' ].push( 'tests: Must not be empty' )

            return struct
        }

        tests
            .forEach( ( test, index ) => {
                AgentTestRunner.#validateSingleTest( { test, index, messages: struct[ 'messages' ] } )
            } )

        if( struct[ 'messages' ].length === 0 ) {
            struct[ 'status' ] = true
        }

        return struct
    }


    static compareTools( { actual, expected } ) {
        const matched = expected
            .filter( ( toolId ) => {
                const isMatched = actual.includes( toolId )

                return isMatched
            } )

        const missing = expected
            .filter( ( toolId ) => {
                const isMissing = !actual.includes( toolId )

                return isMissing
            } )

        const extra = actual
            .filter( ( toolId ) => {
                const isExtra = !expected.includes( toolId )

                return isExtra
            } )

        const status = missing.length === 0

        return { status, missing, extra, matched }
    }


    static compareContent( { actual, assertions } ) {
        if( !Array.isArray( assertions ) || assertions.length === 0 ) {
            const results = []
            const status = true

            return { status, results }
        }

        const results = assertions
            .map( ( assertion ) => {
                const { result } = AgentTestRunner.#evaluateAssertion( { assertion, actual } )

                return result
            } )

        const status = results
            .filter( ( result ) => {
                const hasFailed = !result[ 'passed' ]

                return hasFailed
            } )
            .length === 0

        return { status, results }
    }


    static runReport( { manifest, testResults } ) {
        const agentName = manifest[ 'name' ] || 'unknown'
        const totalTests = testResults.length

        const passed = testResults
            .filter( ( result ) => {
                const toolsPassed = result[ 'toolComparison' ][ 'status' ] === true
                const contentPassed = result[ 'contentComparison' ] === undefined
                    || result[ 'contentComparison' ][ 'status' ] === true

                return toolsPassed && contentPassed
            } )
            .length

        const failed = totalTests - passed

        const details = testResults
            .map( ( result ) => {
                const toolsPassed = result[ 'toolComparison' ][ 'status' ] === true
                const contentPassed = result[ 'contentComparison' ] === undefined
                    || result[ 'contentComparison' ][ 'status' ] === true
                const overallPassed = toolsPassed && contentPassed

                const detail = {
                    testIndex: result[ 'testIndex' ],
                    description: result[ 'description' ],
                    passed: overallPassed,
                    toolComparison: result[ 'toolComparison' ]
                }

                if( result[ 'contentComparison' ] !== undefined ) {
                    detail[ 'contentComparison' ] = result[ 'contentComparison' ]
                }

                return detail
            } )

        const report = { agentName, totalTests, passed, failed, details }

        return { report }
    }


    static #validateSingleTest( { test, index, messages } ) {
        const prefix = `tests[${index}]`

        if( typeof test !== 'object' || Array.isArray( test ) || test === null ) {
            messages.push( `${prefix}: Must be a plain object` )

            return
        }

        if( test[ '_description' ] === undefined || test[ '_description' ] === null ) {
            messages.push( `${prefix}._description: Missing required field` )
        } else if( typeof test[ '_description' ] !== 'string' ) {
            messages.push( `${prefix}._description: Must be type "string"` )
        } else if( test[ '_description' ].trim().length === 0 ) {
            messages.push( `${prefix}._description: Must not be empty` )
        }

        if( test[ 'input' ] === undefined || test[ 'input' ] === null ) {
            messages.push( `${prefix}.input: Missing required field` )
        } else if( typeof test[ 'input' ] !== 'string' ) {
            messages.push( `${prefix}.input: Must be type "string"` )
        } else if( test[ 'input' ].trim().length === 0 ) {
            messages.push( `${prefix}.input: Must not be empty` )
        }

        if( test[ 'expectedTools' ] === undefined || test[ 'expectedTools' ] === null ) {
            messages.push( `${prefix}.expectedTools: Missing required field` )
        } else if( !Array.isArray( test[ 'expectedTools' ] ) ) {
            messages.push( `${prefix}.expectedTools: Must be an array` )
        } else if( test[ 'expectedTools' ].length === 0 ) {
            messages.push( `${prefix}.expectedTools: Must not be empty` )
        } else {
            test[ 'expectedTools' ]
                .forEach( ( toolId, toolIndex ) => {
                    if( typeof toolId !== 'string' ) {
                        messages.push( `${prefix}.expectedTools[${toolIndex}]: Must be type "string"` )
                    } else if( !toolId.includes( '/' ) ) {
                        messages.push( `${prefix}.expectedTools[${toolIndex}]: Must be a valid ID containing "/", got "${toolId}"` )
                    }
                } )
        }

        if( test[ 'expectedContent' ] !== undefined && test[ 'expectedContent' ] !== null ) {
            if( !Array.isArray( test[ 'expectedContent' ] ) ) {
                messages.push( `${prefix}.expectedContent: Must be an array` )
            } else {
                test[ 'expectedContent' ]
                    .forEach( ( assertion, assertionIndex ) => {
                        const assertionPrefix = `${prefix}.expectedContent[${assertionIndex}]`

                        if( typeof assertion !== 'object' || Array.isArray( assertion ) || assertion === null ) {
                            messages.push( `${assertionPrefix}: Must be a plain object` )

                            return
                        }

                        if( assertion[ 'field' ] === undefined || assertion[ 'field' ] === null ) {
                            messages.push( `${assertionPrefix}.field: Missing required field` )
                        } else if( typeof assertion[ 'field' ] !== 'string' ) {
                            messages.push( `${assertionPrefix}.field: Must be type "string"` )
                        }

                        const hasContains = assertion[ 'contains' ] !== undefined
                        const hasEquals = assertion[ 'equals' ] !== undefined
                        const hasType = assertion[ 'type' ] !== undefined

                        if( !hasContains && !hasEquals && !hasType ) {
                            messages.push( `${assertionPrefix}: Must have at least one of "contains", "equals", or "type"` )
                        }

                        if( hasContains && typeof assertion[ 'contains' ] !== 'string' ) {
                            messages.push( `${assertionPrefix}.contains: Must be type "string"` )
                        }

                        if( hasType && typeof assertion[ 'type' ] !== 'string' ) {
                            messages.push( `${assertionPrefix}.type: Must be type "string"` )
                        }
                    } )
            }
        }
    }


    static #evaluateAssertion( { assertion, actual } ) {
        const { field } = assertion
        const fieldValue = AgentTestRunner.#resolveField( { obj: actual, path: field } )

        if( fieldValue === undefined ) {
            const result = {
                assertion,
                passed: false,
                actual: undefined,
                message: `Field "${field}" not found in actual content`
            }

            return { result }
        }

        if( assertion[ 'type' ] !== undefined ) {
            const expectedType = assertion[ 'type' ]
            const actualType = typeof fieldValue

            if( actualType !== expectedType ) {
                const result = {
                    assertion,
                    passed: false,
                    actual: fieldValue,
                    message: `Expected type "${expectedType}", got "${actualType}"`
                }

                return { result }
            }
        }

        if( assertion[ 'equals' ] !== undefined ) {
            const expectedValue = assertion[ 'equals' ]
            const isEqual = fieldValue === expectedValue

            if( !isEqual ) {
                const result = {
                    assertion,
                    passed: false,
                    actual: fieldValue,
                    message: `Expected equals "${expectedValue}", got "${fieldValue}"`
                }

                return { result }
            }
        }

        if( assertion[ 'contains' ] !== undefined ) {
            const searchString = assertion[ 'contains' ]
            const stringValue = String( fieldValue )
            const doesContain = stringValue.includes( searchString )

            if( !doesContain ) {
                const result = {
                    assertion,
                    passed: false,
                    actual: fieldValue,
                    message: `Expected to contain "${searchString}", but not found in "${stringValue}"`
                }

                return { result }
            }
        }

        const result = {
            assertion,
            passed: true,
            actual: fieldValue,
            message: 'Assertion passed'
        }

        return { result }
    }


    static #resolveField( { obj, path } ) {
        const segments = path.split( '.' )
        const value = segments
            .reduce( ( current, segment ) => {
                if( current === undefined || current === null ) {
                    const skip = undefined

                    return skip
                }

                const next = current[ segment ]

                return next
            }, obj )

        return value
    }
}


export { AgentTestRunner }
