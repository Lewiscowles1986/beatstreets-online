import { z } from 'zod';
import { toBoolean, toNumber, toNumericKeys } from './primitives';

/**
 * Raw attack entry as it appears in attacks.json. JSON cannot hold booleans as keys
 * in combo maps or true booleans where the source wrote "True", so we capture the
 * raw shape and normalise it into {@link Attack}.
 */
const RawAttackSchema = z
  .object({
    sprite: z.string().optional(),
    strength: z.union([z.number(), z.string()]).optional(),
    anim_time: z.union([z.number(), z.string()]).optional(),
    frame_time: z.union([z.number(), z.string()]).optional(),
    frames: z.union([z.number(), z.string()]).optional(),
    hit_frames: z.array(z.union([z.number(), z.string()])).optional(),
    recovery_time: z.union([z.number(), z.string()]).optional(),
    reach: z.union([z.number(), z.string()]).optional(),
    throw: z.union([z.boolean(), z.string()]).optional(),
    grab: z.union([z.boolean(), z.string()]).optional(),
    combo_next: z.record(z.string(), z.string()).optional(),
    flyingkick: z.union([z.boolean(), z.string()]).optional(),
    stamina_cost: z.union([z.number(), z.string()]).optional(),
    rear_attack: z.union([z.boolean(), z.string()]).optional(),
    stamina_damage_multiplier: z.union([z.number(), z.string()]).optional(),
    stun_time_multiplier: z.union([z.number(), z.string()]).optional(),
    initial_sound: z.array(z.union([z.string(), z.number()])).optional(),
    hit_sound: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .passthrough();

export const RawAttacksSchema = z.record(z.string(), RawAttackSchema);
export type RawAttacks = z.infer<typeof RawAttacksSchema>;
export type RawAttack = z.infer<typeof RawAttackSchema>;

/** A fully normalised attack the engine can read without JSON quirks. */
export interface AttackSpec {
  name: string;
  sprite?: string;
  strength: number;
  anim_time?: number;
  frame_time: number;
  frames: number;
  hit_frames: number[];
  recovery_time: number;
  reach: number;
  throw: boolean;
  grab: boolean;
  combo_next: Record<number, string>;
  flying_kick: boolean;
  stamina_cost: number;
  rear_attack: boolean;
  stamina_damage_multiplier: number;
  stun_time_multiplier: number;
  initial_sound?: [string, number];
  hit_sound?: [string, number];
}

/** Normalise one raw attack into an {@link Attack}. */
export function normaliseAttack(raw: RawAttack, name: string): AttackSpec {
  const sound = (v?: unknown): [string, number] | undefined => {
    if (!Array.isArray(v) || v.length < 2) return undefined;
    return [String(v[0]), toNumber(v[1])];
  };
  return {
    name,
    sprite: raw.sprite,
    strength: toNumber(raw.strength),
    anim_time: raw.anim_time === undefined ? undefined : toNumber(raw.anim_time),
    frame_time: toNumber(raw.frame_time) || 5,
    frames: toNumber(raw.frames),
    hit_frames: (raw.hit_frames ?? []).map(toNumber),
    recovery_time: toNumber(raw.recovery_time),
    reach: toNumber(raw.reach) || 80,
    throw: toBoolean(raw.throw),
    grab: toBoolean(raw.grab),
    combo_next: raw.combo_next ? toNumericKeys(raw.combo_next) : {},
    flying_kick: toBoolean(raw.flyingkick),
    stamina_cost: toNumber(raw.stamina_cost) || 10,
    rear_attack: toBoolean(raw.rear_attack),
    stamina_damage_multiplier: toNumber(raw.stamina_damage_multiplier) || 1,
    stun_time_multiplier: toNumber(raw.stun_time_multiplier) || 1,
    initial_sound: sound(raw.initial_sound),
    hit_sound: sound(raw.hit_sound),
  };
}

/** Parse a whole attacks.json document into a map of normalised attacks. */
export function parseAttacks(raw: RawAttacks): Record<string, AttackSpec> {
  const out: Record<string, AttackSpec> = {};
  for (const [name, attack] of Object.entries(raw)) {
    out[name] = normaliseAttack(attack, name);
  }
  return out;
}
