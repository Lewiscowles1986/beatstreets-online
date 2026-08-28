import { GameSpec, buildSpec, resolveStages } from '@beatstreets/engine';
import configJson from '../assets/data/config.json';
import charactersJson from '../assets/data/characters.json';
import attacksJson from '../assets/data/attacks.json';
import stagesJson from '../assets/data/stages.json';
import storyJson from '../assets/data/story.json';

/** A spec source handed TO the shell: invoked when a game starts, not at import time,
 *  so the shell never hard-wires where the stages/config JSON comes from (the bundled
 *  loader is just the default). After the first call the shell keeps the loaded spec
 *  and reuses it for every later game build ("the state is set going forward"). */
export type SpecLoader = () => GameSpec;

/** Whether the static data has been loaded and validated once. */
let spec: GameSpec | null = null;

/**
 * Build (and cache) the fully validated game spec from the bundled JSON data.
 * Throws if any document fails its schema.
 */
export function loadGameSpec(): GameSpec {
  if (spec) return spec;
  spec = buildSpec({
    config: configJson,
    characters: charactersJson,
    attacks: attacksJson,
    stages: stagesJson,
    story: storyJson,
  });
  return spec;
}

/** The game spec with all stage positions resolved against config. */
export function loadResolvedStages() {
  return resolveStages(loadGameSpec());
}

/** Convenience access to the config constants. */
export function config() {
  return loadGameSpec().config;
}
