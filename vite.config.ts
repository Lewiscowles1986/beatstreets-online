import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import babelPluginReactCompiler from 'babel-plugin-react-compiler';

// Client-side static build. Assets (sprites, music) are imported from ./src/assets,
// so the resulting bundle can be hosted on any static host (e.g. GitHub Pages).
export default defineConfig({
  // React Compiler is wired through @vitejs/plugin-react's Babel pipeline.
  // The project runs on React 18, so the compiler targets the 18 runtime
  // (which pulls its memoization runtime from `react-compiler-runtime`).
  plugins: [
    react({
      babel: {
        plugins: [[babelPluginReactCompiler, { target: '18' }]],
      },
    }),
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  test: {
    // Vitest config (inline) — jsdom for component/DOM tests.
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
