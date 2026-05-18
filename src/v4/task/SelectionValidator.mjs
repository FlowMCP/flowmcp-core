/**
 * FlowMCP — MIT License
 *
 * DISCLAIMER: This code orchestrates calls to third-party APIs. Each API has
 * its own Terms of Services. FlowMCP makes no representation about TOS
 * compliance, data licensing, or fitness for any purpose. Users are solely
 * responsible for reviewing and adhering to each API provider's terms.
 *
 * For more information, see LICENSE.md and DISCLAIMER.md in the repo root.
 */

const ARRAY_FIELDS = [ 'tools', 'skills', 'resources', 'prompts' ]
const REQUIRED_STRING_FIELDS = [ 'namespace', 'name', 'version', 'description' ]

export class SelectionValidator {

    static validate( { selection, catalog } ) {
        const errors = []

        REQUIRED_STRING_FIELDS.forEach( ( field ) => {
            const value = selection[ field ]
            if( value === undefined || value === null ) {
                errors.push( `STRUCT: Missing required field '${field}'` )
            } else if( typeof value !== 'string' || value.trim().length === 0 ) {
                errors.push( `STRUCT: Field '${field}' must be a non-empty string` )
            }
        } )

        const whenToUse = selection[ 'whenToUse' ]
        if( whenToUse === undefined || whenToUse === null ) {
            errors.push( `SEL001: Missing required field 'whenToUse'` )
        } else if( typeof whenToUse !== 'string' || whenToUse.trim().length === 0 ) {
            errors.push( `SEL001: Field 'whenToUse' must be a non-empty string` )
        }

        const hasContent = ARRAY_FIELDS.some( ( field ) => {
            const arr = selection[ field ]
            return Array.isArray( arr ) && arr.length > 0
        } )

        if( !hasContent ) {
            errors.push(
                `SEL002: At least one of [${ARRAY_FIELDS.join( ', ' )}] must be a non-empty array`
            )
        }

        SelectionValidator._checkSlashRule( { selection, errors } )

        if( catalog !== undefined && catalog !== null ) {
            SelectionValidator._checkResolvability( { selection, catalog, errors } )
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }


    static _checkSlashRule( { selection, errors } ) {
        const slashRequired = [ 'tools', 'resources', 'prompts' ]
        const slashForbidden = [ 'skills' ]

        slashRequired.forEach( ( field ) => {
            const refs = selection[ field ]
            if( !Array.isArray( refs ) ) {
                return
            }
            refs.forEach( ( ref ) => {
                if( typeof ref !== 'string' || !ref.includes( '/' ) ) {
                    errors.push( `VAL110: ${field} entry "${ref}" must contain "/" (full ID form)` )
                }
            } )
        } )

        slashForbidden.forEach( ( field ) => {
            const refs = selection[ field ]
            if( !Array.isArray( refs ) ) {
                return
            }
            refs.forEach( ( ref ) => {
                if( typeof ref === 'string' && ref.includes( '/' ) ) {
                    errors.push( `VAL110: ${field} entry "${ref}" must NOT contain "/" (inline form only)` )
                }
            } )
        } )
    }


    static _checkResolvability( { selection, catalog, errors } ) {
        const referenceTypes = [
            { field: 'tools', catalogKey: 'tools' },
            { field: 'resources', catalogKey: 'resources' },
            { field: 'prompts', catalogKey: 'prompts' },
            { field: 'skills', catalogKey: 'skills' }
        ]

        referenceTypes.forEach( ( { field, catalogKey } ) => {
            const refs = selection[ field ]
            if( !Array.isArray( refs ) ) {
                return
            }

            const available = catalog[ catalogKey ] !== undefined && catalog[ catalogKey ] !== null
                ? catalog[ catalogKey ]
                : []
            const availableSet = new Set( available )

            refs.forEach( ( ref ) => {
                if( !availableSet.has( ref ) ) {
                    errors.push( `SEL003: ${field} reference '${ref}' is not resolvable in the catalog` )
                }
            } )
        } )
    }

}
