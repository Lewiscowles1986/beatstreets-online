import { z } from 'zod';
import { Pos2 } from './primitives';

/**
 * A stage is a group of enemies plus weapons and powerups, up to a scrolling limit.
 * Positions in JSON use either absolute coordinates or the symbolic "MIN_WALK_Y"
 * placeholder (resolved against the config at load time).
 */
const EntitySchema = z.object({
  type: z.string(),
  pos: z.array(z.union([z.number(), z.string()])),
  // Portal spawns
  spawns: z.array(z.string()).optional(),
  spawn_interval: z.number().optional(),
  spawn_interval_change: z.number().optional(),
  max_spawn_interval: z.number().optional(),
  max_enemies: z.number().optional(),
  // Delayed spawn
  start_timer: z.number().optional(),
});

export const StageSchema = z.object({
  enemies: z.array(EntitySchema),
  weapons: z.array(EntitySchema),
  powerups: z.array(EntitySchema),
  max_scroll_x: z.number(),
});

export const StagesSchema = z.object({
  stages: z.array(StageSchema),
});

export type Entity = z.infer<typeof EntitySchema>;
export type Stage = z.infer<typeof StageSchema>;
export type Stages = z.infer<typeof StagesSchema>;

/** Resolve a raw pos (numbers / "MIN_WALK_Y") against the config's walk line. */
export function resolvePos(pos: Array<number | string>, minWalkY: number): Pos2 {
  const [x, y] = pos;
  return [Number(x), y === 'MIN_WALK_Y' ? minWalkY : Number(y)];
}
