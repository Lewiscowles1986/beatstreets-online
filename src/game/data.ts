import { GameSpec, buildSpec, resolveStages } from './dsl/game-spec';
import configJson from '../assets/data/config.json';
import charactersJson from '../assets/data/characters.json';
import attacksJson from '../assets/data/attacks.json';
import stagesJson from '../assets/data/stages.json';
import storyJson from '../assets/data/story.json';

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
