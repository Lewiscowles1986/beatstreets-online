import { defineConfig } from 'vitest/config';

// Engine package tests are pure logic (no DOM), so no jsdom or setup files.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
