import { z } from 'zod';

/**
 * The game config (was config.json). Tuning constants that the whole game reads.
 */
export const GameConfigSchema = z.object({
  WIDTH: z.number(),
  HEIGHT: z.number(),
  TITLE: z.string(),
  HEALTH_STAMINA_BAR_WIDTH: z.number(),
  HEALTH_STAMINA_BAR_HEIGHT: z.number(),
  INTRO_ENABLED: z.boolean(),
  FLYING_KICK_VEL_X: z.number(),
  FLYING_KICK_VEL_Y: z.number(),
  JUMP_GRAVITY: z.number(),
  THROWN_GRAVITY: z.number(),
  WEAPON_GRAVITY: z.number(),
  BARREL_THROW_VEL_X: z.number(),
  BARREL_THROW_VEL_Y: z.number(),
  PLAYER_THROW_VEL_X: z.number(),
  PLAYER_THROW_VEL_Y: z.number(),
  BASE_STAMINA_DAMAGE_MULTIPLIER: z.number(),
  MIN_STAMINA: z.number(),
  DEBUG_LOGGING_ENABLED: z.boolean(),
  DEBUG_SHOW_SCROLL_POS: z.boolean(),
  DEBUG_SHOW_BOUNDARY: z.boolean(),
  DEBUG_SHOW_ATTACKS: z.boolean(),
  DEBUG_SHOW_TARGET_POS: z.boolean(),
  DEBUG_SHOW_ANCHOR_POINTS: z.boolean(),
  DEBUG_SHOW_HIT_AREA_WIDTH: z.boolean(),
  DEBUG_SHOW_LOGS: z.boolean(),
  DEBUG_SHOW_HEALTH_AND_STAMINA: z.boolean(),
  DEBUG_PROFILING: z.boolean(),
  SPECIAL_FONT_SYMBOLS: z.record(z.string(), z.string()),
  // Title-screen tuning. Defaulted (not required) so unrelated config fixtures don't
  // have to carry them; the shipped config.json overrides the defaults.
  TITLE_PROMPT: z.string().default('PRESS % OR Z'),
  TITLE_PROMPT_Y_OFFSET: z.number().default(50),
  TITLE_LOGO_SWAP_FRAMES: z.number().default(20),
  MIN_WALK_Y: z.number(),
  ENEMY_APPROACH_PLAYER_DISTANCE: z.number(),
  ENEMY_APPROACH_PLAYER_DISTANCE_SCOOTERBOY: z.number(),
  ENEMY_APPROACH_PLAYER_DISTANCE_BARREL: z.number(),
  ANCHOR_CENTRE: z.tuple([z.string(), z.string()]),
  ANCHOR_CENTRE_BOTTOM: z.tuple([z.string(), z.string()]),
  BACKGROUND_TILE_SPACING: z.number(),
  BACKGROUND_TILES: z.array(z.string()),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;
