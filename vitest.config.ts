import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'llm/**/*.ts',
        'auth/**/*.ts',
        'db/**/*.ts',
        'errors/**/*.ts',
        'maiRuntime.ts'
      ],
      exclude: ['**/*.test.ts', '**/index.ts']
    },
    testTimeout: 10000
  }
});
