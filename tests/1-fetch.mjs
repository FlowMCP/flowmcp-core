import { testSchema as schema } from "./data/testSchema.mjs";
import { FlowMCP } from "../src/index.mjs"
import fs from 'fs'


const ETHERSCAN_API_KEY = fs
    .readFileSync( './../../../.env', 'utf8' )
    .split( '\n' )
    .map( a => a.split( '=' ).map( b => b.trim() ) )
    .find( a => a[ 0 ] === 'ETHERSCAN_API_KEY' )[ 1 ]

const serverParams = { ETHERSCAN_API_KEY }
const tests = FlowMCP
    .getAllTests( { schema } )
const [ routeName, userParams ] = tests[ 0 ]
const { status, messages, data } = await FlowMCP
    .fetch( { schema, userParams, serverParams, routeName } )

console.log( 'status:', status )