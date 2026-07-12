import { describe, test, expect } from '@jest/globals'

import { PrefillExecutor } from '../../../src/v4/task/PrefillExecutor.mjs'
import { PlaceholderResolver } from '../../../src/v4/task/PlaceholderResolver.mjs'
import { skill } from './fixtures/skills/skill-with-prefill-chain.mjs'


// Memo 153 / Rest-Item 6 (F4=B) — the chained PrefillExecutor -> PlaceholderResolver proof.
//
// research-03 flagged PrefillExecutor / PlaceholderResolver as "dormant". Memo 152 (PRD-027)
// already unit-tests both modules (PrefillExecutor.test.mjs, PlaceholderResolver.test.mjs incl.
// the {{prefill:...}} branch), pins the VAL016 gate (why a committed schema can NOT reach them
// through Pipeline.load — main.skills is forbidden) and observes the dormancy through the loader
// (becomes-live-e2e.test.mjs "PRD-027 dormancy proof"). The ONE thing not yet proven was the
// CHAIN: a prefilled tool result flowing INTO placeholder resolution, exactly as
// Pipeline.#runPrefill (:523) then #resolveSkillContents (:587) wire it. This suite closes that
// gap on a committed fixture — the maximal honest realization of F4=B, since VAL016 makes the
// literal "committed schema through the validating loader" impossible.

describe( 'Memo 153 / F4=B — PrefillExecutor -> PlaceholderResolver chained on a committed skill fixture', () => {
    const emptyCatalog = () => {
        return { tools: new Map(), resources: new Map(), prompts: new Map(), skills: new Map() }
    }

    const fetchFn = async ( toolRef ) => {
        return `ONLINE(${toolRef})`
    }

    test( 'a prefilled tool result flows into the skill content via {{prefill:...}}', async () => {
        // Stage 1 — PrefillExecutor.execute (the Pipeline :523 call): run the skill's prefill.
        const { prefillResults } = await PrefillExecutor.execute( {
            skill,
            userParams: { service: 'geo' },
            fetchFn,
            timeout: 1000
        } )

        expect( prefillResults instanceof Map ).toBe( true )
        expect( prefillResults.get( 'getStatus' ) ).toBe( 'ONLINE(getStatus)' )

        // Stage 2 — PlaceholderResolver.resolve (the Pipeline :587 call): resolve the content,
        // feeding the prefillResults from stage 1 (the exact chained data flow).
        const { resolved } = PlaceholderResolver.resolve( {
            content: skill.content,
            catalog: emptyCatalog(),
            sharedLists: {},
            inputs: { service: 'geo' },
            prefillResults
        } )

        expect( resolved ).toContain( 'Current status: ONLINE(getStatus).' )
        expect( resolved ).toContain( 'Checked for geo.' )
        expect( resolved ).not.toContain( '{{prefill' )
        expect( resolved ).not.toContain( '[ERROR' )
    } )

    test( 'a missing prefill key surfaces a coded ERROR marker (no silent blank)', () => {
        const { resolved } = PlaceholderResolver.resolve( {
            content: 'status: {{prefill:absent}}',
            catalog: emptyCatalog(),
            sharedLists: {},
            inputs: {},
            prefillResults: new Map()
        } )

        expect( resolved ).toContain( "[ERROR: Token 'prefill:absent' not found]" )
    } )
} )
