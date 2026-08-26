import { useMemo } from 'react';
import { loadGameSpec } from '../game/data';
import { spriteCount } from '../game/assets';

export interface SpecStats {
  title: string;
  width: number;
  height: number;
  stages: number;
  characters: number;
  attacks: number;
  sprites: number;
}

/** Compute the headline stats of the loaded game spec (throws if invalid). */
export function computeSpecStats(): SpecStats {
  const spec = loadGameSpec();
  return {
    title: spec.config.TITLE,
    width: spec.config.WIDTH,
    height: spec.config.HEIGHT,
    stages: spec.stages.stages.length,
    characters: Object.keys(spec.characters.characters).length,
    attacks: Object.keys(spec.attacks).length,
    sprites: spriteCount(),
  };
}

/** A presentational card describing the validated game spec (no side effects). */
export function SpecOverview() {
  const stats = useMemo(() => computeSpecStats(), []);
  return (
    <dl className="spec">
      <dt>Title</dt>
      <dd>{stats.title}</dd>
      <dt>Canvas</dt>
      <dd>
        {stats.width} × {stats.height}
      </dd>
      <dt>Stages</dt>
      <dd>{stats.stages}</dd>
      <dt>Characters</dt>
      <dd>{stats.characters}</dd>
      <dt>Attacks</dt>
      <dd>{stats.attacks}</dd>
      <dt>Sprites</dt>
      <dd>{stats.sprites}</dd>
    </dl>
  );
}
