import { useState } from 'react';
import { loadGameSpec, loadResolvedStages } from './game/data';
import { spriteCount } from './game/assets';
import './index.css';

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

/**
 * Load the game-spec overview eagerly. All of the data is available synchronously,
 * so this is derived once during the initial render rather than fetched in an effect.
 */
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

/**
 * Minimal app shell for the Beat Streets web port.
 *
 * This is intentionally a thin host: the real surface area is the component library
 * (Storybook) and the game engine. It renders an overview of the loaded game spec so
 * you can see the data-driven DSL working, and links to the Storybook build.
 */
export default function App() {
  const [{ info, error }] = useState<Loaded>(loadInfo);

  return (
    <div className="shell">
      <h1>Beat Streets — Web</h1>
      <p>
        A TypeScript web port of the Beat Streets game. The engine is under construction;
        this shell verifies the data-driven DSL loads and validates the game spec.
      </p>

      {error && <p className="error">Failed to load game spec: {error}</p>}

      {info && (
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
      )}

      <nav className="links">
        <a href="./storybook/index.html" rel="noopener">
          Storybook (component library)
        </a>
      </nav>
    </div>
  );
}
