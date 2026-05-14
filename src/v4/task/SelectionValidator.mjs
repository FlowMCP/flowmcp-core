const ARRAY_FIELDS = [ 'tools', 'skills', 'resources', 'prompts' ]
const REQUIRED_STRING_FIELDS = [ 'namespace', 'name', 'version', 'description' ]

export class SelectionValidator {

    static validate( { selection } ) {
        const errors = []

        REQUIRED_STRING_FIELDS.forEach( ( field ) => {
            const value = selection[ field ]
            if( value === undefined || value === null ) {
                errors.push( `SEL003: Missing required field '${field}'` )
            } else if( typeof value !== 'string' || value.trim().length === 0 ) {
                errors.push( `SEL003: Field '${field}' must be a non-empty string` )
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

        return {
            valid: errors.length === 0,
            errors
        }
    }

}
