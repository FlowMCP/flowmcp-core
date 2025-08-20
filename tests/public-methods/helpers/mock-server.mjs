class MockMcpServer {
    constructor() {
        this.tools = new Map()
        this.toolCallCount = 0
    }

    tool( toolName, description, zodSchema, func ) {
        const mcpTool = {
            name: toolName,
            description,
            schema: zodSchema,
            handler: func,
            callCount: 0
        }
        
        this.tools.set( toolName, mcpTool )
        this.toolCallCount++
        
        return mcpTool
    }

    getTool( toolName ) {
        return this.tools.get( toolName )
    }

    getAllTools() {
        return Array.from( this.tools.values() )
    }

    getToolNames() {
        return Array.from( this.tools.keys() )
    }

    async callTool( toolName, userParams ) {
        const tool = this.tools.get( toolName )
        if( !tool ) {
            throw new Error( `Tool '${toolName}' not found` )
        }
        
        tool.callCount++
        const result = await tool.handler( userParams )
        
        return result
    }

    reset() {
        this.tools.clear()
        this.toolCallCount = 0
    }

    getStats() {
        return {
            toolCount: this.tools.size,
            totalCalls: this.toolCallCount,
            tools: Array.from( this.tools.entries() ).map( ( [ name, tool ] ) => ({
                name,
                callCount: tool.callCount,
                description: tool.description
            }) )
        }
    }
}

const createMockServer = () => new MockMcpServer()


export { MockMcpServer, createMockServer }