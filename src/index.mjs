import { Interface } from './task/Interface.mjs'
import { Fetch } from './task/Fetch.mjs'
import { Validation } from './task/Validation.mjs'
import { Test } from './task/Test.mjs'


class FlowMCP {
    static getZodInterfaces( { schema } ) {
        Validation.schema( { schema } )
        const result = Interface.from( { schema } )

        return result
    }


    static getAllTests( { schema } ) {
        Validation.schema( { schema } )
        const result = Test.all( { schema } )

        return result
    }


    static async fetch( { schema, userParams, serverParams, routeName } ) {
        Validation.schema( { schema } )
        Validation.serverParams( { serverParams } )
        Validation.userParams( { userParams } )
        const result = await Fetch.from( { schema, userParams, serverParams, routeName } )

        return result
    }
}


export { FlowMCP, Validation }