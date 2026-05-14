export class PrefillExecutor {

    /**
     * Executes prefill tool calls before skill delivery.
     *
     * Each entry in skill.prefill is called via fetchFn.
     * On timeout or error, a placeholder string is stored — the skill is ALWAYS delivered.
     *
     * @param {Object} params
     * @param {Object} params.skill - The skill object, may contain a prefill array
     * @param {Object} params.userParams - User-provided parameters (passed to fetchFn)
     * @param {Function} params.fetchFn - Async function(toolRef, params) => string result
     * @param {number} params.timeout - Timeout in milliseconds (mandatory, never hardcoded)
     * @returns {Promise<{ prefillResults: Map<string, string> }>}
     */
    static async execute( { skill, userParams, fetchFn, timeout } ) {
        if( skill === undefined || skill === null || typeof skill !== 'object' ) {
            throw new Error( `PrefillExecutor.execute: 'skill' must be an object` )
        }
        if( typeof fetchFn !== 'function' ) {
            throw new Error( `PrefillExecutor.execute: 'fetchFn' must be a function` )
        }
        if( timeout === undefined || timeout === null ) {
            throw new Error( `PrefillExecutor.execute: 'timeout' is required (no default)` )
        }
        if( typeof timeout !== 'number' || Number.isNaN( timeout ) || timeout <= 0 ) {
            throw new Error( `PrefillExecutor.execute: 'timeout' must be a positive number, got ${timeout}` )
        }

        const prefillResults = new Map()
        const entries = skill.prefill

        if( !Array.isArray( entries ) || entries.length === 0 ) {
            return { prefillResults }
        }

        const tasks = entries
            .map( ( entry ) => PrefillExecutor._executeEntry( {
                entry,
                userParams,
                fetchFn,
                timeout,
                prefillResults
            } ) )

        await Promise.allSettled( tasks )

        return { prefillResults }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    static async _executeEntry( { entry, userParams, fetchFn, timeout, prefillResults } ) {
        if( entry === undefined || entry === null || typeof entry !== 'object' ) {
            prefillResults.set( '_invalid', `[PREFILL ERROR: invalid entry (not an object)]` )
            return
        }

        const tool = entry.tool
        if( tool === undefined || tool === null || typeof tool !== 'string' || tool.length === 0 ) {
            prefillResults.set( '_invalid', `[PREFILL ERROR: entry missing 'tool' field]` )
            return
        }

        const entryParams = entry.params !== undefined && entry.params !== null ? entry.params : {}
        const userParamsSafe = userParams !== undefined && userParams !== null ? userParams : {}
        const mergedParams = { ...entryParams, ...userParamsSafe }

        const result = await PrefillExecutor._withTimeout( {
            fn: () => fetchFn( tool, mergedParams ),
            timeout,
            toolRef: tool
        } )

        prefillResults.set( tool, result )
    }

    /**
     * Wraps an async function with a timeout.
     * On timeout: returns error placeholder string.
     * On HTTP error (object with status/statusText): returns error placeholder string.
     * Never throws.
     */
    static async _withTimeout( { fn, timeout, toolRef } ) {
        let timer = null

        const timeoutPromise = new Promise( ( resolve ) => {
            timer = setTimeout( () => {
                resolve( `[PREFILL ERROR: Timeout after ${timeout}ms for ${toolRef}]` )
            }, timeout )
        } )

        const callPromise = PrefillExecutor._invokeFetch( { fn } )

        const winner = await Promise.race( [ callPromise, timeoutPromise ] )
        clearTimeout( timer )
        return winner
    }

    static async _invokeFetch( { fn } ) {
        try {
            const result = await fn()
            return PrefillExecutor._formatResult( { result } )
        } catch( err ) {
            const message = err !== undefined && err !== null && typeof err.message === 'string' && err.message.length > 0
                ? err.message
                : String( err )
            return `[PREFILL ERROR: ${message}]`
        }
    }

    static _formatResult( { result } ) {
        if( typeof result === 'string' ) {
            return result
        }

        if( result !== undefined && result !== null && typeof result === 'object' && result.status !== undefined ) {
            const statusText = typeof result.statusText === 'string' && result.statusText.length > 0
                ? ` ${result.statusText}`
                : ''
            return `[PREFILL ERROR: ${result.status}${statusText}]`
        }

        if( result === undefined ) {
            return `[PREFILL ERROR: fetchFn returned undefined]`
        }

        return JSON.stringify( result )
    }

}
