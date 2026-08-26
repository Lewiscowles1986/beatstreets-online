import { GameConfig, GameConfigSchema } from './config';
import { Characters, CharactersSchema } from './characters';
import { AttackSpec, RawAttacksSchema, parseAttacks } from './attacks';
import { Stages, StagesSchema, resolvePos, Stage } from './stages';
import { Story, StorySchema } from './story';
import { z } from 'zod';

/**
 * A fully validated, normalised snapshot of the whole game's data. This is the single
 * source of truth the engine reads; it is built from the raw JSON files by
 * {@link loadGameSpec}.
 */
export interface GameSpec {
  config: GameConfig;
  characters: Characters;
  attacks: Record<string, AttackSpec>;
  stages: Stages;
  story: Story;
}

/** Parse and normalise one config document into the spec. */
export function buildSpec(raw: {
  config: unknown;
  characters: unknown;
  attacks: unknown;
  stages: unknown;
  story: unknown;
}): GameSpec {
  const config = GameConfigSchema.parse(raw.config);
  const characters = CharactersSchema.parse(raw.characters);
  const attacks = parseAttacks(RawAttacksSchema.parse(raw.attacks));
  const stages = StagesSchema.parse(raw.stages);
  const story = StorySchema.parse(raw.story);
  return { config, characters, attacks, stages, story };
}

/**
 * Resolve a stage's entities (positions) against the config. Returns a new stages
 * object with all "MIN_WALK_Y" placeholders replaced by the numeric walk line.
 */
export function resolveStages(spec: GameSpec): Stages {
  const minWalkY = spec.config.MIN_WALK_Y;
  return {
    stages: spec.stages.stages.map((stage) => ({
      ...stage,
      enemies: stage.enemies.map((e) => ({ ...e, pos: resolvePos(e.pos, minWalkY) })),
      weapons: stage.weapons.map((e) => ({ ...e, pos: resolvePos(e.pos, minWalkY) })),
      powerups: stage.powerups.map((e) => ({ ...e, pos: resolvePos(e.pos, minWalkY) })),
    })),
  };
}

/** Strict parse that throws on invalid data (used in tests / boot validation). */
export function assertValid(spec: GameSpec): void {
  // Re-parsing each document guarantees the types hold under Zod's strictness.
  GameConfigSchema.parse(spec.config);
  CharactersSchema.parse(spec.characters);
  RawAttacksSchema.parse(spec.attacks);
  StagesSchema.parse(spec.stages);
  StorySchema.parse(spec.story);
}

// Re-export types for convenience.
export type { GameConfig, Characters, Stages, Stage, Story };
export { z };
