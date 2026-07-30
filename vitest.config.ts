import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // 'server-only' unconditionally throws when required outside Next's
      // webpack build (Next aliases it to an empty module for server bundles;
      // vitest doesn't know that trick). Mirror the same aliasing here so
      // src/lib/{db,repo,stripe,enrollment}.ts can be imported directly.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 20000,
  },
});
