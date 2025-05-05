import { schema } from "./../schemas/v1.2.0/moralis-com/eth/priceApi.mjs"
import { Validation, FlowMCP } from "./../src/index.mjs"


const test = Validation.schema( { schema } )
const flowMCP = FlowMCP.getZodInterfaces( { schema } )

console.log( 'Validation was', test ? 'successful.' : 'failed.' )