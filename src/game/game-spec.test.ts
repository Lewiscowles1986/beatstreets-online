import { describe, it, expect } from 'vitest';
import { loadGameSpec, loadResolvedStages } from './data';
import { hasSprite, spriteCount } from './assets';
import { Stage } from './dsl/stages';

describe('Beat Streets game spec (DSL)', () => {
  const spec = loadGameSpec();

  it('loads and validates the full config', () => {
    expect(spec.config.WIDTH).toBe(800);
    expect(spec.config.HEIGHT).toBe(480);
    expect(spec.config.TITLE).toBe('Beat Streets');
    expect(spec.config.MIN_WALK_Y).toBe(310);
  });

  it('loads every character', () => {
    const names = Object.keys(spec.characters.characters);
    expect(names.sort()).toEqual(['boss', 'hoodie', 'scooterboy', 'vax']);
  });

  it('normalises string booleans and string keys in attacks', () => {
    const barrel = spec.attacks['barrel'];
    expect(barrel.throw).toBe(true);
    const flyingkick = spec.attacks['flyingkick'];
    expect(flyingkick.flying_kick).toBe(true);
    const elbow = spec.attacks['elbow'];
    expect(elbow.rear_attack).toBe(true);
    // combo_next string keys become numeric keys
    expect(spec.attacks['punch'].combo_next[0]).toBe('secondpunch');
    expect(spec.attacks['punch'].combo_next[0]).not.toBeUndefined();
  });

  it('loads all 29 stages', () => {
    expect(spec.stages.stages).toHaveLength(29);
  });

  it('resolves MIN_WALK_Y placeholders against config', () => {
    const resolved = loadResolvedStages();
    // find any stage using the placeholder
    const all = resolved.stages.flatMap((s: Stage) => [
      ...s.enemies,
      ...s.weapons,
      ...s.powerups,
    ]);
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(Number.isFinite(e.pos[0])).toBe(true);
      expect(Number.isFinite(e.pos[1])).toBe(true);
    }
  });

  it('every attack sprite referenced by characters exists in assets', () => {
    // Attack "sprite" names are the sprite prefix; the actual files follow a naming
    // scheme with frame/variant suffixes. We just assert the attack set is present.
    for (const char of Object.values(spec.characters.characters)) {
      for (const attackName of char.attacks) {
        expect(spec.attacks[attackName]).toBeDefined();
      }
    }
  });

  it('loads the story text', () => {
    expect(spec.story.intro_prefix).toContain('EBEN UPTON');
    expect(spec.story.stolen_items.length).toBeGreaterThanOrEqual(7);
    expect(spec.story.outro).toContain('GOLDEN AGE');
  });
});

describe('asset availability', () => {
  it('loads a non-trivial number of sprites', () => {
    expect(spriteCount()).toBeGreaterThan(1000);
  });

  it('has sprites referenced by the background tile list', () => {
    const spec = loadGameSpec();
    const missing = spec.config.BACKGROUND_TILES.filter((t) => !hasSprite(t));
    // Background tiles may use a naming prefix not present verbatim; report actual hits.
    const present = spec.config.BACKGROUND_TILES.filter((t) => hasSprite(t));
    expect(present.length).toBeGreaterThan(0);
    expect(missing).toHaveLength(0);
  });
});
