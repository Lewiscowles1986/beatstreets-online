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
    rollupOptions: {
      input: {
        main: 'index.html',
        // Dedicated e2e entry for the title-screen fidelity check (GOAL G5). Kept as a
        // separate page so the test route does not ship inside the main app bundle.
        title: 'title.html',
        // Dedicated e2e entry for the intro-text fidelity check (GOAL G5).
        intro: 'intro.html',
        // Dedicated e2e entry for the seeded stage-1 live-gameplay fidelity check (GOAL G2/G3).
        stage: 'stage.html',
      },
      output: {
        // Split the heavy, rarely-changing dependencies into their own chunks so the
        // entry shell stays small and vendor code can be cached separately.
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-compiler-runtime/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/zod/')) {
            return 'vendor-zod';
          }
          if (id.includes('@beatstreets/engine') || id.includes('/packages/engine/')) {
            return 'engine';
          }
          if (id.includes('/render/webgl-render')) {
            return 'webgl-render';
          }
          return undefined;
        },
      },
    },
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
