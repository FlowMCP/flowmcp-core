import { schema } from "flowmcp-schemas/schemas/thegraph/schema.mjs"
import { Validation } from "./../src/index.mjs"
console.log( '>>>', schema['routes']['getCryptoCryptopanicNews'])
const test = Validation.schema( { schema } )
console.log( 'Validation was', test ? 'successful.' : 'failed.' )