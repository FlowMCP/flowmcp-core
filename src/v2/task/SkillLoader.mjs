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

import { pathToFileURL } from 'node:url'
import { join } from 'node:path'


class SkillLoader {
    static async load( { skillDefinitions, schemaDir } ) {
        const skills = {}
        const messages = []

        const entries = Object.entries( skillDefinitions )

        const results = await Promise.allSettled(
            entries
                .map( ( [ skillName, definition ] ) => {
                    const result = SkillLoader.#loadSingle( {
                        skillName,
                        definition,
                        schemaDir
                    } )

                    return result
                } )
        )

        results
            .forEach( ( result, index ) => {
                const [ skillName ] = entries[ index ]

                if( result.status === 'rejected' ) {
                    messages.push( `skill "${skillName}": ${result.reason.message}` )

                    return
                }

                const { skill, placeholders } = result.value
                skills[ skillName ] = { ...skill, placeholders }
            } )

        const status = messages.length === 0

        return { status, skills, messages }
    }


    static async #loadSingle( { skillName, definition, schemaDir } ) {
        const { file } = definition
        const absolutePath = join( schemaDir, file )
        const fileUrl = pathToFileURL( absolutePath ).href
        const module = await import( fileUrl )
        const skill = module[ 'skill' ] || null

        if( skill === null ) {
            throw new Error( 'Missing "skill" export' )
        }

        const content = skill[ 'content' ]
        if( content === undefined || content === null || content === '' ) {
            throw new Error( 'Skill content is empty or missing' )
        }
        const { placeholders } = SkillLoader.#extractPlaceholders( { content } )

        return { skill, placeholders }
    }


    static #extractPlaceholders( { content } ) {
        const placeholders = []
        const pattern = /\{\{(tool|resource|skill|input):([^}]+)\}\}/g
        let match = pattern.exec( content )

        while( match !== null ) {
            const [ , type, name ] = match
            placeholders.push( { type, name } )
            match = pattern.exec( content )
        }

        return { placeholders }
    }
}


export { SkillLoader }
