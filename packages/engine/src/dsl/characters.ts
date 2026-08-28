import { z } from 'zod';

/**
 * A character definition (was characters.json). Enemies (and the player) are defined
 * by name + attack list + tuning. Optional fields carry type-specific behaviour.
 */
export const CharacterSchema = z.object({
  name: z.string(),
  attacks: z.array(z.string()),
  health: z.number().optional(),
  speed: z.union([z.array(z.number()), z.number()]).optional(),
  score: z.number().optional(),
  approach_player_distance: z.number().optional(),
  scooter_speed_slow: z.number().optional(),
  scooter_speed_fast: z.number().optional(),
  scooter_acceleration: z.number().optional(),
  scooter_hit_attack: z.string().optional(),
  stamina: z.number().optional(),
  anchor_y: z.number().optional(),
  half_hit_area: z.array(z.number()).optional(),
  /** Sound played when this character is hit (python Fighter hit_sound — the portal). */
  hit_sound: z.string().optional(),
});

export type Character = z.infer<typeof CharacterSchema>;

export const CharactersSchema = z.object({
  characters: z.record(z.string(), CharacterSchema),
});

export type Characters = z.infer<typeof CharactersSchema>;
