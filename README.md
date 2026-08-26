# Beat Streets — Web

A **TypeScript web port** of the *Beat Streets* game from the **Code the Classics** Python
monorepo. It re-expresses the pygame/pygame-zero game with web-native rendering
(Canvas 2D now, WebGL later) — **not** a pygame API clone, but the same actions and
conventions, so the game remains editable as data.

## Stack
- **Vite** — client-side static build (hostable anywhere, incl. GitHub Pages).
- **React** — thin shell + component library (HUD, menus, stage viewer).
- **Canvas / WebGL** — a `Render` abstraction; `CanvasRender` first, `WebGLRender` later.
- **Typed DSL** (`zod`) — the game's JSON data becomes validated, typed specs.
- **ATDD** — Vitest + Playwright acceptance tests written before behaviour.
- **Storybook** — component explorer + screenshot stories.
- **Playwright** — screenshots and automated control.

## Scripts
```bash
npm install
npm run dev          # Vite dev server
npm run build        # typecheck + build static bundle to dist/
npm test             # Vitest unit/acceptance tests
npm run storybook    # component explorer
npm run test:e2e     # Playwright end-to-end + screenshots
```

## Where the game data lives
Data is copied from the Python repo into `src/assets/data/*.json` and validated by the
DSL in `src/game/dsl/`. The DSL is the single source of truth the engine reads.
