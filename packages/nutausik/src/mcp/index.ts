import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

export interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export { TOOLS } from './tools.js'
export { toolHandler } from './handlers.js'

export async function startMcpServer(): Promise<void> {
  const server = new Server(
    { name: 'nutausik', version: '0.2.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const { TOOLS } = await import('./tools.js')
    return { tools: TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }))}
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { toolHandler } = await import('./handlers.js')
    const { name, arguments: args } = request.params
    try {
      const result = await toolHandler(name, args ?? {})
      return {
        content: [{ type: 'text', text: String(result) }],
      }
    } catch (e: unknown) {
      return {
        content: [{ type: 'text', text: `Error: ${(e as Error).message}` }],
        isError: true,
      }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
