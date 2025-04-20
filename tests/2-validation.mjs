import { schema } from "flowmcp-schemas/schemas/etherscan/schema.mjs"
import { Validation } from "./../src/index.mjs"

const test = Validation.schema( { schema } )
console.log( 'Validation was', test ? 'successful.' : 'failed.' )