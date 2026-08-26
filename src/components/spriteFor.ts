import { hasSprite } from '../game/assets';

/**
 * Pick a representative sprite per entity type for preview. All names are checked
 * against the asset set; unknown types fall back to a hero frame.
 */
const ENTITY_SPRITES: Record<string, string> = {
  EnemyVax: 'vax_stand_0_0_0',
  EnemyHoodie: 'hoodie_stand_0_0_2',
  EnemyScooterboy: 'scooterboy_bike_0_0_2',
  EnemyBoss: 'boss_stand_1_0_2',
  EnemyPortal: 'portal_grow_2',
  Barrel: 'barrel_roll_1_2_shadow',
  Stick: 'hero_pickup_stick_1_0',
  Chain: 'hero_pickup_chain_0_0',
  HealthPowerup: 'health_pickup',
  ExtraLifePowerup: 'status_life9',
};

const FALLBACK = 'hero_stand_1_0_shadow';

/** Return a sprite name for an entity type, falling back if the preferred is missing. */
export function spriteFor(type: string): string {
  const preferred = ENTITY_SPRITES[type];
  if (preferred && hasSprite(preferred)) return preferred;
  // Try a case-insensitive match on any bundled sprite whose name starts with the type.
  return hasSprite(FALLBACK) ? FALLBACK : 'blank';
}
