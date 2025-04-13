
import { testSchema as schema } from "../tests/data/testSchema.mjs";
import { Validation } from "../src/index.mjs"


const test = Validation
    .schema( { schema } )
console.log( 'Validation was', test ? 'successful.' : 'failed.' )
