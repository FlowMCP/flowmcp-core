import { schema } from "flowmcp-schemas/schemas/dune/trendingContracts.mjs"
import { Validation } from "./../src/index.mjs"


const test = Validation.schema( { schema } )
console.log( 'Validation was', test ? 'successful.' : 'failed.' )