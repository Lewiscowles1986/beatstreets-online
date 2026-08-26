# Beat Streets — Web: Architecture Notes

A TypeScript web port of the **Beat Streets** game from the **Code the Classics** Python
monorepo. It re-expresses the pygame/pygame-zero game with web-native rendering and a
typed, data-driven DSL — **not** a pygame API clone.

## Stack
| Tool | Role |
|---|---|
| **Vite** | Client-side static build → GitHub Pages |
| **React 18** | Shell + component library (HUD, menus, stage viewer) |
| **React Compiler** | Automatic memoization (wired via `babel-plugin-react-compiler`, target 18) |
| **Canvas 2D** (`Render` abstraction) | Sprite/entity rendering; WebGL backend planned |
| **Zod DSL** | The game's JSON becomes validated, typed specs |
| **Vitest** | Unit + acceptance tests (ATDD) |
| **Storybook** | Component explorer + screenshot stories |
| **Playwright** | End-to-end control + screenshots |

## Layout
```
src/game/dsl/        Zod schemas + normalisers per data file (config, characters,
                     attacks, stages, story). Single source of truth.
src/game/data.ts     Loads + validates all JSON into a GameSpec; resolves stages.
src/game/assets.ts   Sprite + music asset loader (Vite glob import).
src/game/core/       Pure logic ports: math (Vec2/clamp/remap/8-way angles), input
                     (rising-edge), scene (SceneManager).
src/game/render/     Render abstraction + CanvasRender implementation.
src/components/      React components: SpecOverview, StageView, StageList, Hud, hook.
e2e/                 Playwright specs (app smoke + Storybook screenshots).
src/assets/          Copied game data (JSON) + sprites + music.
```

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build → `dist/`
- `npm run lint` — ESLint (react-compiler + react-hooks rules)
- `npm run test` — Vitest
- `npm run storybook` / `build-storybook`
- `npm run test:e2e` — Playwright (chromium project, against `vite preview`)
- `npm run e2e:screenshot` — Playwright screenshots (against Storybook build)
- GitHub Actions `.github/workflows/pages.yml` deploys app + Storybook to Pages.

## Data pipeline
The game's JSON data (copied from `games/beatstreets/*.json`) is parsed by the DSL in
`src/game/dsl/`. JSON limitations (string booleans like `"True"`, string-keyed combo
maps) are normalised so the engine reads clean typed values. `loadGameSpec()` validates
everything with Zod and throws on invalid data at boot.

## ATDD workflow
Acceptance tests are written before behaviour. Each data file has validation tests
(`game-spec.test.ts`) mirroring the Python repo's `test_beatstreets_content.py` /
`test_track_dsl.py`. Playwright specs verify the built app boots and the component
library renders. Subsequent phases (core math/input, engine, input adapters + Konami)
follow the same write-the-test-then-implement pattern.
