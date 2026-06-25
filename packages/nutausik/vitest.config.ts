import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: [
        'src/backend/crud.ts',
        'src/backend/fts.ts',
        'src/backend/graph.ts',
        'src/backend/metrics.ts',
        'src/backend/queries.ts',
        'src/backend/schema.ts',
        'src/backend/migrations/index.ts',
        'src/brain/search.ts',
        'src/config.ts',
        'src/crypto/**/*.ts',
        'src/gates/**/*.ts',
        'src/mcp/handlers.ts',
        'src/model/routing.ts',
        'src/providers/**/*.ts',
        'src/renar/**/*.ts',
        'src/risk/**/*.ts',
        'src/service/**/*.ts',
        'src/utils/**/*.ts',
        'src/verify/**/*.ts',
        'src/audit/**/*.ts',
        'src/skills/**/*.ts',
        'src/stacks/**/*.ts',
      ],
      thresholds: {
        lines: 76,
        functions: 80,
        branches: 70,
        statements: 76,
      },
    },
  },
})
