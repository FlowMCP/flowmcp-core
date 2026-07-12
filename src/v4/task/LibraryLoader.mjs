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

import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'


class LibraryLoader {
    static #defaultAllowlist = [
        // Node.js Built-ins
        'zlib',
        'crypto',
        'buffer',
        'path',
        'url',
        'util',
        'stream',
        'querystring',
        // Blockchain / Web3
        'ethers',
        // Trading / Finance
        'ccxt',
        'indicatorts',
        'yahoo-finance2',
        'trading-signals',
        'talib',
        'technicalindicators',
        'moment',
        // Visualization
        'vega-lite',
        'vega',
        'canvas',
        // Storage / IPFS
        'pinata',
        'irys',
        // Database
        'better-sqlite3'
    ]


    static async load( { requiredLibraries, allowlist, resolveBase, resolveBases } ) {
        if( !requiredLibraries || requiredLibraries.length === 0 ) {
            return { libraries: {} }
        }

        const effectiveAllowlist = allowlist || LibraryLoader.#defaultAllowlist
        const messages = []

        requiredLibraries
            .forEach( ( lib ) => {
                if( !effectiveAllowlist.includes( lib ) ) {
                    messages.push( `SEC020: Library "${lib}" is not on the allowlist` )
                }
            } )

        if( messages.length > 0 ) {
            throw new Error( messages.join( '; ' ) )
        }

        // Ordered resolution bases (Memo 150 model): each base is a directory whose
        // node_modules may hold native/CJS libs (e.g. talib). `resolveBases[]` wins
        // (allowed-libraries -> CLI-base -> schema-dir, in the caller's order); the
        // legacy singular `resolveBase` is accepted as a one-element list; otherwise
        // the host process cwd is the only base. createRequire wants a referencing
        // filename, so each base is anchored on an index.js inside it (need not exist).
        const orderedBases = Array.isArray( resolveBases ) && resolveBases.length > 0
            ? resolveBases
            : ( resolveBase ? [ resolveBase ] : [ process.cwd() ] )
        const libraries = {}

        const loadPromises = requiredLibraries
            .map( async ( lib ) => {
                const module = await LibraryLoader.#resolveOne( { lib, orderedBases } )
                libraries[ lib ] = module
            } )

        await Promise.all( loadPromises )

        return { libraries }
    }


    static async #resolveOne( { lib, orderedBases } ) {
        try {
            const module = await import( lib )

            return module.default || module
        } catch( importError ) {
            // Fallback for native (.node) bindings and libs not resolvable as ESM from
            // core (e.g. talib): resolve + require from each base in order, first hit
            // wins. CJS require handles native addons that ESM import rejects with
            // ERR_UNKNOWN_FILE_EXTENSION '.node'. The allowlist check upstream stays in
            // front (fail-closed) — this only changes HOW an allowed lib loads.
            const { resolved, value, lastError } = LibraryLoader
                .#requireFromBases( { lib, orderedBases } )

            if( !resolved ) {
                const detail = lastError !== null ? lastError.message : 'no resolution bases provided'

                throw new Error( `Library "${lib}" not resolvable from any base — ${detail}` )
            }

            return value
        }
    }


    static #requireFromBases( { lib, orderedBases } ) {
        const outcome = orderedBases
            .reduce( ( acc, base ) => {
                if( acc.resolved ) {
                    return acc
                }

                try {
                    const requireFromBase = createRequire( join( base, 'index.js' ) )
                    const module = requireFromBase( lib )

                    return { resolved: true, value: module.default || module, lastError: null }
                } catch( err ) {
                    return { resolved: false, value: null, lastError: err }
                }
            }, { resolved: false, value: null, lastError: null } )

        return outcome
    }


    // Memo 152 / PRD-018 (D-06, F17=A) — external requiredLibraries resolution, ported from
    // the CLI (#resolveHandlers requiredLibraries block + #loadOneLibrary, Memo 119/150). This
    // is the Memo-150 model: libraries resolve from the caller-supplied ordered `resolveBases`
    // (allowed-libraries -> CLI base -> schema dir); the CLI computes those paths and passes
    // them in, so core stays env-free. There is deliberately NO name-allowlist here: the gate is
    // folder presence (installed = allowed, Memo 150 F7) and it stays with the CLI. The separate
    // #defaultAllowlist / load() SEC020 path is untouched (still used by the grading-det pipeline).
    //
    // Three failure classes are distinguished (Memo 119):
    //   - NOT-INSTALLED     — no base can `require.resolve` the lib -> LIB-001 (coded fail-loud,
    //                         carries the exact `npm install --prefix <base>` command).
    //   - INSTALLED-BUT-UNLOADABLE — a base resolves the lib but load throws (native binding
    //                         missing / built for a different Node.js ABI) -> LIB-BINDING (left
    //                         UNCODED on purpose so the CLI logs+degrades: it needs a rebuild, not
    //                         an install; NEVER the misleading LIB-001 "install it" path).
    //   - per-base resolve miss — surfaced as LIB-002 through the optional `emit` callback
    //                         (defaults to a noop so core does no I/O of its own; the CLI wires it
    //                         to CliOutput.emitCoded).
    // LIB-BINDING takes precedence over LIB-001 (a broken binding is reported before a missing one).
    //
    // Memo 152 / PRD-027 (doctor gap b) — `installTargets` is an optional plain object mapping a
    // library name to the exact token that follows `npm install --prefix <base>` for THAT lib.
    // The CLI computes it (org-internal FlowMCP libs -> `github:FlowMCP/<repo>`, npm libs -> the
    // bare name) and passes it in, so core stays env-free and does no name classification of its
    // own. When a lib is absent from the map (or no map is given) the bare lib name is used — the
    // pre-PRD-027 behavior, so existing callers/tests are unaffected.
    static async resolveExternal( { requiredLibraries, resolveBases, installHintBase, emit, installTargets } ) {
        const effectiveRequired = Array.isArray( requiredLibraries ) ? requiredLibraries : []

        if( effectiveRequired.length === 0 ) {
            return { libraries: {} }
        }

        const orderedBases = Array.isArray( resolveBases ) ? resolveBases : []
        const emitFn = typeof emit === 'function' ? emit : () => {}
        const requires = orderedBases
            .map( ( base ) => createRequire( join( base, 'index.js' ) ) )

        const libraries = {}
        const notInstalled = []
        const loadFailed = []

        await effectiveRequired
            .reduce( ( promise, lib ) => promise.then( async () => {
                const loaded = await LibraryLoader
                    .#loadOneFromBases( { lib, requires, emit: emitFn } )

                if( loaded[ 'status' ] === true ) {
                    libraries[ lib ] = loaded[ 'module' ]
                } else if( loaded[ 'loadError' ] !== null && loaded[ 'loadError' ] !== undefined ) {
                    loadFailed.push( { lib, reason: loaded[ 'loadError' ] } )
                } else {
                    notInstalled.push( lib )
                }
            } ), Promise.resolve() )

        if( loadFailed.length > 0 ) {
            const detail = loadFailed
                .map( ( entry ) => `${entry.lib} (${entry.reason})` )
                .join( '; ' )

            throw new Error( `LIB-BINDING: required librar${loadFailed.length === 1 ? 'y is' : 'ies are'} installed but failed to load — a native binding is missing or built for a different Node.js ABI: ${detail}. Rebuild the native module (e.g. "npm rebuild ${loadFailed[ 0 ].lib}" in the CLI, or reinstall it). This is NOT a missing dependency.` )
        }

        if( notInstalled.length > 0 ) {
            const hintBase = typeof installHintBase === 'string' && installHintBase.length > 0
                ? installHintBase
                : '<allowed-libraries>'

            const targets = installTargets !== undefined && installTargets !== null ? installTargets : {}
            const installTokens = notInstalled
                .map( ( lib ) => targets[ lib ] !== undefined && targets[ lib ] !== null ? targets[ lib ] : lib )

            throw new Error( `LIB-001 required librar${notInstalled.length === 1 ? 'y' : 'ies'} not resolvable from allowed-libraries (${hintBase}), CLI base, nor schema dir: ${notInstalled.join( ', ' )}. Install into allowed-libraries: npm install --prefix ${hintBase} ${installTokens.join( ' ' )}` )
        }

        return { libraries }
    }


    // Memo 152 / PRD-027 (doctor gap a) — a NON-throwing sibling of resolveExternal that reports,
    // per library, whether it truly loads. `flowmcp doctor`'s module-present check used to decide
    // pass/fail purely via `require.resolve` (resolvable != loadable) — a native lib like talib
    // whose package resolves but whose `.node` fails to dlopen reported green. probe() runs the SAME
    // load path the runtime uses (#loadOneFromBases: require.resolve THEN a real import/require), so
    // doctor reflects runtime reality: an installed-but-unloadable native binding lands in
    // `loadFailed`, a genuinely missing lib in `notInstalled`. It never throws (doctor aggregates
    // across many schemas) and never emits (offline check).
    static async probe( { requiredLibraries, resolveBases } ) {
        const effectiveRequired = Array.isArray( requiredLibraries ) ? requiredLibraries : []
        const orderedBases = Array.isArray( resolveBases ) ? resolveBases : []
        const requires = orderedBases
            .map( ( base ) => createRequire( join( base, 'index.js' ) ) )

        const ok = []
        const notInstalled = []
        const loadFailed = []

        await effectiveRequired
            .reduce( ( promise, lib ) => promise.then( async () => {
                const loaded = await LibraryLoader
                    .#loadOneFromBases( { lib, requires, emit: () => {} } )

                if( loaded[ 'status' ] === true ) {
                    ok.push( lib )
                } else if( loaded[ 'loadError' ] !== null && loaded[ 'loadError' ] !== undefined ) {
                    loadFailed.push( { lib, reason: loaded[ 'loadError' ] } )
                } else {
                    notInstalled.push( lib )
                }
            } ), Promise.resolve() )

        return { ok, notInstalled, loadFailed }
    }


    static async #loadOneFromBases( { lib, requires, emit } ) {
        // Ported 1:1 from CLI #loadOneLibrary (Memo 119/150). `requires` is the ordered
        // resolution chain; the first base that resolves + loads the lib wins. A base that
        // resolves the lib but fails to load flags loadError (INSTALLED-BUT-UNLOADABLE) — never
        // collapsed into a "not installed" miss.
        let loadError = null

        const attempt = await requires
            .reduce( async ( accPromise, req ) => {
                const acc = await accPromise

                if( acc[ 'status' ] === true ) {
                    return acc
                }

                let resolvedPath = null
                try {
                    resolvedPath = req.resolve( lib )
                } catch( resolveErr ) {
                    emit( { code: 'LIB-002', location: 'loadOneLibrary: require base could not resolve lib', err: resolveErr } )
                    return acc
                }

                try {
                    const mod = await import( pathToFileURL( resolvedPath ).href )
                    return { status: true, module: mod.default || mod }
                } catch( importErr ) {
                    try {
                        const mod = req( lib )
                        return { status: true, module: mod.default || mod }
                    } catch( requireErr ) {
                        loadError = requireErr.message || importErr.message
                        return acc
                    }
                }
            }, Promise.resolve( { status: false, module: null } ) )

        return { ...attempt, loadError }
    }


    static getDefaultAllowlist() {
        const allowlist = [ ...LibraryLoader.#defaultAllowlist ]

        return { allowlist }
    }


    static mergeAllowlist( { extraAllowlist } ) {
        const isArray = Array.isArray( extraAllowlist )
        const extra = isArray ? extraAllowlist : []
        const merged = [ ...LibraryLoader.#defaultAllowlist, ...extra ]
        const deduped = Array.from( new Set( merged ) )

        return { allowlist: deduped }
    }
}


export { LibraryLoader }
