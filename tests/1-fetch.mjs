import { FlowMCP } from './../src/index.mjs'
import { getEnv } from './helpers/utils.mjs'
import { schema } from "flowmcp-schemas/schemas/thegraph/schema.mjs"


const { ETHERSCAN_API_KEY } = getEnv( { 
    'path': './../../../.env', 
    'selection': [ [ 'ETHERSCAN_API_KEY', 'ETHERSCAN_API_KEY' ] ] 
} )
const serverParams = { ETHERSCAN_API_KEY }
const tests = FlowMCP
    .getAllTests( { schema } )
const { routeName, userParams } = tests[ 0 ]
const { status, messages, data } = await FlowMCP
    .fetch( { schema, userParams, serverParams, routeName } )

console.log( 'status:', status )
console.log( 'messages:', messages )
console.log( 'data:', data )