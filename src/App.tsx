import { lazy, Suspense, useState } from 'react';
import { loadGameSpec, loadResolvedStages } from './game/data';
import { spriteCount } from './game/assets';
import './index.css';

// The heavy game host (engine + WebGL/Canvas renderers) is loaded lazily so the entry
// shell stays small; it's only fetched when the user actually starts playing.
const GameCanvas = lazy(() =>
  import('./components/GameCanvas').then((m) => ({ default: m.GameCanvas })),
);

type AppInfo = {
  title: string;
  width: number;
  height: number;
  stages: number;
  characters: number;
  attacks: number;
  sprites: number;
};

type Loaded = { info: AppInfo | null; error: string | null };

/** Load the game-spec overview eagerly (data is synchronous, no network fetch). */
function loadInfo(): Loaded {
  try {
    const spec = loadGameSpec();
    const stages = loadResolvedStages();
    return {
      info: {
        title: spec.config.TITLE,
        width: spec.config.WIDTH,
        height: spec.config.HEIGHT,
        stages: stages.stages.length,
        characters: Object.keys(spec.characters.characters).length,
        attacks: Object.keys(spec.attacks).length,
        sprites: spriteCount(),
      },
      error: null,
    };
  } catch (e) {
    return { info: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export default function App() {
  const [{ info, error }] = useState<Loaded>(loadInfo);
  const [playing, setPlaying] = useState(false);
  // `?renderer=2d` forces the Canvas-2D backend (used by the orientation e2e check to
  // compare the WebGL and 2D renderers against each other).
  const forceCanvas2D = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('renderer') === '2d';

  return (
    <div className="shell">
      <h1>Beat Streets — Web</h1>
      <p>
        A TypeScript web port of the Beat Streets game. The engine is under construction;
        this shell verifies the data-driven DSL loads and validates the game spec.
      </p>

      {error && <p className="error">Failed to load game spec: {error}</p>}

      {info && !playing && (
        <>
          <dl className="spec">
            <dt>Title</dt>
            <dd>{info.title}</dd>
            <dt>Canvas</dt>
            <dd>
              {info.width} × {info.height}
            </dd>
            <dt>Stages</dt>
            <dd>{info.stages}</dd>
            <dt>Characters</dt>
            <dd>{info.characters}</dd>
            <dt>Attacks</dt>
            <dd>{info.attacks}</dd>
            <dt>Sprites</dt>
            <dd>{info.sprites}</dd>
          </dl>
          <button type="button" className="play" onClick={() => setPlaying(true)}>
            Play
          </button>
        </>
      )}

      {playing && (
        <Suspense fallback={<div aria-busy="true" role="status">loading game…</div>}>
          <GameCanvas stage={1} width={800} height={480} debug forceCanvas2D={forceCanvas2D} />
        </Suspense>
      )}

      <nav className="links">
        <a href="./storybook/index.html" rel="noopener">
          Storybook (component library)
        </a>
      </nav>
    </div>
  );
}
