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

// Memo 152 / PRD-018 (D-07) — the namespace-catalog build was moved out of the
// CLI monolith into this core v4 module. It walks the loaded schemas array and
// records every tool/resource/prompt/skill spec-id plus container groupings and
// cross-source collisions.
//
// FROZEN FORMAT — the returned index object (keys tools/resources/prompts/skills/
// containers/collisions/builtAt/schemaCount and their nested shapes) is consumed
// verbatim by mcp-geo-app (namespace-index.json cache, Memo 128). Any change to
// the shape or key ordering is a major bump and requires a consumer migration.
class CatalogIndex {
    // Shared add-or-collide for ALL four primitives (tools/resources/prompts/
    // skills). Before writing a spec-id, check whether it already exists; if so,
    // record a collision instead of silently overwriting (last-wins) / pushing a
    // first-wins duplicate. The collision entry carries `files` AND `sources` so
    // the visible warning can suggest the qualified "<source>:<spec-id>" fix.
    // Mutates `map` and `collisions`.
    static trackPrimitive( { map, collisions, specId, file, source, extra } ) {
        if( map[ specId ] ) {
            const existing = collisions
                .find( ( c ) => {
                    const matches = c[ 'specId' ] === specId

                    return matches
                } )

            if( existing ) {
                existing[ 'files' ].push( file )
                existing[ 'sources' ].push( source )
            } else {
                collisions.push( {
                    specId,
                    'files': [ map[ specId ][ 'file' ], file ],
                    'sources': [ map[ specId ][ 'source' ], source ]
                } )
            }

            return
        }

        map[ specId ] = { file, source, ...extra }
    }


    // Render the collisions[] list (built by trackPrimitive over all four
    // primitives) into visible, non-blocking warnings. Each warning names the
    // colliding spec-id, the involved sources and the copyable qualified fix
    // "<source>:<spec-id>". One bundled line per spec-id (no per-call noise).
    // English, no risk jargon. Returns [] when there is no collision.
    static formatCollisionWarnings( { collisions } ) {
        if( Array.isArray( collisions ) === false || collisions.length === 0 ) {
            return { 'warnings': [] }
        }

        const warnings = collisions
            .map( ( collision ) => {
                const { specId, files, sources } = collision
                const knownSources = ( Array.isArray( sources ) ? sources : [] )
                    .filter( ( s ) => typeof s === 'string' && s.length > 0 )
                const uniqueSources = [ ...new Set( knownSources ) ]
                const fixForms = uniqueSources.length > 0
                    ? uniqueSources
                        .map( ( s ) => `${s}:${specId}` )
                        .join( ' or ' )
                    : `<source>:${specId}`
                const sourceLabel = uniqueSources.length > 0 ? uniqueSources.join( ', ' ) : 'unknown sources'
                const fileLabel = ( Array.isArray( files ) ? files : [] ).join( ', ' )

                return {
                    specId,
                    'sources': uniqueSources,
                    'files': Array.isArray( files ) ? files : [],
                    'message': `Collision on "${specId}" across sources [${sourceLabel}] (files: ${fileLabel}). The unqualified call uses the first match. To pick one explicitly, prefix the source: ${fixForms}.`
                }
            } )

        return { warnings }
    }


    // Build the full namespace catalog from a loaded schemas array. Each entry is
    // { main, file, source }. Returns { index } in the FROZEN shape (see header).
    static build( { schemas } ) {
        const tools = {}
        const resources = {}
        const prompts = {}
        const skills = {}
        const containers = {}
        const collisions = []
        const schemasSkipped = []

        schemas
            .forEach( ( schemaEntry ) => {
                const { main, file, source } = schemaEntry

                if( !main ) {
                    return
                }

                const namespace = main[ 'namespace' ]

                if( !namespace ) {
                    schemasSkipped.push( { file, source, 'reason': 'missing namespace' } )

                    return
                }

                const schemaTools = main[ 'tools' ] || main[ 'routes' ] || {}

                Object.keys( schemaTools )
                    .forEach( ( routeName ) => {
                        const specId = `${namespace}/tool/${routeName}`
                        CatalogIndex.trackPrimitive( { 'map': tools, collisions, specId, file, source, 'extra': { routeName } } )
                    } )

                const schemaResources = main[ 'resources' ] || {}

                Object.keys( schemaResources )
                    .forEach( ( resourceName ) => {
                        const specId = `${namespace}/resource/${resourceName}`
                        CatalogIndex.trackPrimitive( { 'map': resources, collisions, specId, file, source, 'extra': { resourceName } } )
                    } )

                const schemaPrompts = main[ 'prompts' ] || {}

                Object.keys( schemaPrompts )
                    .forEach( ( promptName ) => {
                        const specId = `${namespace}/prompt/${promptName}`
                        CatalogIndex.trackPrimitive( { 'map': prompts, collisions, specId, file, source, 'extra': { promptName } } )
                    } )

                const schemaSkills = main[ 'skills' ] || []

                schemaSkills
                    .forEach( ( skill ) => {
                        const skillName = skill[ 'name' ]

                        if( !skillName ) {
                            return
                        }

                        const specId = `${namespace}/skill/${skillName}`
                        CatalogIndex.trackPrimitive( { 'map': skills, collisions, specId, file, source, 'extra': { skillName } } )
                    } )
            } )

        const containerGroups = {}

        schemas
            .forEach( ( schemaEntry ) => {
                const { main, file, source } = schemaEntry

                if( !main ) {
                    return
                }

                const namespace = main[ 'namespace' ]

                if( !namespace ) {
                    return
                }

                const containerName = file.replace( /\.mjs$/, '' ).replace( /-part\d+$/, '' )
                const containerKey = `${namespace}/${containerName}`

                if( !containerGroups[ containerKey ] ) {
                    containerGroups[ containerKey ] = { namespace, containerName, source, 'files': [] }
                }

                containerGroups[ containerKey ][ 'files' ].push( file )
            } )

        Object.keys( containerGroups )
            .forEach( ( key ) => {
                const { files } = containerGroups[ key ]
                containers[ key ] = { files }
            } )

        const index = {
            tools,
            resources,
            prompts,
            skills,
            containers,
            collisions,
            'builtAt': new Date().toISOString(),
            'schemaCount': schemas.length
        }

        return { index }
    }
}


export { CatalogIndex }
