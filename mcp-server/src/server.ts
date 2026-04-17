import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import type { ApiClient } from './api-client.js'
import type { ToolContext } from './types.js'
import { listAccountsTool } from './tools/list-accounts.js'
import { getBalanceTool } from './tools/get-balance.js'
import { createTransactionTool } from './tools/create-transaction.js'
import { listTransactionsTool } from './tools/list-transactions.js'

interface McpTool {
  name: string
  description: string
  inputSchema: z.ZodObject<z.ZodRawShape>
  handler: (input: never, ctx: ToolContext) => Promise<unknown>
}

const ALL_TOOLS: McpTool[] = [
  listAccountsTool as unknown as McpTool,
  getBalanceTool as unknown as McpTool,
  createTransactionTool as unknown as McpTool,
  listTransactionsTool as unknown as McpTool,
]

export function buildMcpServer(api: ApiClient): Server {
  const server = new Server(
    { name: 'finanzas-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = ALL_TOOLS.find((t) => t.name === req.params.name)
    if (!tool) throw new Error(`Unknown tool: ${req.params.name}`)

    const result = await tool.handler((req.params.arguments ?? {}) as never, { api })
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  })

  return server
}

// Minimal zod -> JSON schema (only for our use cases)
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [key, val] of Object.entries(shape)) {
      properties[key] = primitiveToJsonSchema(val)
      if (!val.isOptional()) required.push(key)
    }
    return { type: 'object', properties, required }
  }
  return { type: 'object' }
}

function primitiveToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  let inner: z.ZodTypeAny = schema
  // Unwrap optionals/defaults
  while (
    inner instanceof z.ZodOptional ||
    inner instanceof z.ZodDefault
  ) {
    inner = (inner._def as { innerType: z.ZodTypeAny }).innerType
  }
  if (inner instanceof z.ZodString) return { type: 'string' }
  if (inner instanceof z.ZodNumber) return { type: 'number' }
  if (inner instanceof z.ZodBoolean) return { type: 'boolean' }
  if (inner instanceof z.ZodEnum) return { type: 'string', enum: (inner as z.ZodEnum<[string, ...string[]]>).options }
  return {}
}
