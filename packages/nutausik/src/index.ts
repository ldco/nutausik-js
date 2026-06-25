#!/usr/bin/env node

export { NUTAUSIK_VERSION } from './version.js'
export type * from './types/index.js'
export { startMcpServer } from './mcp/index.js'
export { TOOLS } from './mcp/tools.js'
export { toolHandler } from './mcp/handlers.js'

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args[0] === 'serve' || args[0] === '--serve' || !args.length) {
    const { startMcpServer } = await import('./mcp/index.js')
    await startMcpServer()
    return
  }

  if (args[0] === 'mcp') {
    const { startMcpServer } = await import('./mcp/index.js')
    await startMcpServer()
    return
  }

  const { main: cliMain } = await import('./cli/index.js')
  cliMain()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
