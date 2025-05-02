import { Interface } from './task/Interface.mjs'
import { Validation } from "./task/Validation.mjs"
import { Test } from "./task/Test.mjs"
import { Fetch } from "./task/Fetch.mjs"


class FlowMCP {
    static activateServerTools( { server, schema, serverParams, include=[], exclude=[], validate=true } ) {
        if( validate ) {
            Validation.schema( { schema } )
            Validation.serverParams( { schema, serverParams } )
        }

        const { routes } = schema
        const results = Object
            .keys( routes )
            .filter( ( routeName ) => {
                if( include.length > 0 ) {
                    return include.includes( routeName )
                } else if( exclude.length > 0 ) {
                    return !exclude.includes( routeName )
                } else {
                    return true
                }
            } )
            .map( ( routeName ) => {
                const status = FlowMCP
                    .activateServerTool( { server, schema, serverParams, routeName, 'validate': false } )
                return { routeName, status }
            } )

        return results
    }


    static activateServerTool( { server, schema, routeName, serverParams, validate=true } ) {
        const { toolName, description, zod, func } = FlowMCP
            .prepareServerTool( { schema, serverParams, routeName, validate } )
        server.tool( toolName, description, zod, func )

        return true
    }


    static prepareServerTool( { schema, serverParams, routeName, validate=true } ) {
        if( validate ) {
            Validation.schema( { schema } )
            Validation.serverParams( { schema, serverParams } )
            Validation.routeName( { schema, routeName } )
        }

        const { toolName, description, zod } = Interface
            .toServerTool( { schema, routeName } )
        const result = {
            toolName,
            description,
            zod,
            'func': async( userParams ) => {
                const { status, messages, data, dataAsString } = await Fetch
                    .from( { schema, userParams, serverParams, routeName } )

                if( !status ) {
                    return { content: [ { type: "text", text: `Error: ${messages.join( ', ' )}` } ] }
                } else {
                    return { content: [ { type: "text", text: `Result: ${dataAsString}` } ] }
                }
            }
        }

        return result 
    }


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
        Validation.serverParams( { schema, serverParams } )
        Validation.routeName( { schema, routeName } )
        Validation.userParams( { schema, userParams, routeName } )
        const { struct, payload } = await Fetch
            .from( { schema, userParams, serverParams, routeName } )

        return struct
    }
}



export { FlowMCP, Validation }