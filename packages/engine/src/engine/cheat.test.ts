import { describe, it, expect } from 'vitest';
import { CheatState, CHEAT_MENU } from './cheat';

describe('CheatState (menu navigation)', () => {
  it('starts on STAGE SELECT in menu mode', () => {
    const c = new CheatState(29);
    expect(c.mode).toBe('menu');
    expect(c.selectedItem).toBe('STAGE SELECT');
    expect(c.settings).toEqual({ godMode: false, onePunch: false });
  });

  it('cycles the cursor with up/down', () => {
    const c = new CheatState(29);
    c.update({ up: true, down: false, a: false, b: false });
    expect(c.selectedItem).toBe('ONE PUNCH'); // wrapped to last
    c.update({ up: false, down: true, a: false, b: false });
    expect(c.selectedItem).toBe('STAGE SELECT');
  });

  it('toggles GOD MODE when selected', () => {
    const c = new CheatState(29);
    // move down to GOD MODE, then A
    c.update({ up: false, down: true, a: false, b: false });
    const action = c.update({ up: false, down: false, a: true, b: false });
    expect(action).toBe('select');
    expect(c.settings.godMode).toBe(true);
    // toggle off
    c.update({ up: false, down: false, a: true, b: false });
    expect(c.settings.godMode).toBe(false);
  });

  it('toggles ONE PUNCH', () => {
    const c = new CheatState(29);
    c.update({ up: false, down: true, a: false, b: false }); // GOD MODE
    c.update({ up: false, down: true, a: false, b: false }); // ONE PUNCH
    c.update({ up: false, down: false, a: true, b: false });
    expect(c.settings.onePunch).toBe(true);
  });

  it('enters stage-select mode and picks a stage', () => {
    const c = new CheatState(29);
    c.update({ up: false, down: false, a: true, b: false }); // select STAGE SELECT
    expect(c.mode).toBe('stage-select');
    // up increments stage (clamped)
    c.update({ up: true, down: false, a: false, b: false });
    c.update({ up: true, down: false, a: false, b: false });
    expect(c.stage).toBe(3);
    const action = c.update({ up: false, down: false, a: true, b: false });
    expect(action).toBe('select');
    expect(c.mode).toBe('menu');
  });

  it('clamps stage selection to [1, stageCount]', () => {
    const c = new CheatState(3);
    c.update({ up: false, down: false, a: true, b: false }); // stage-select
    c.update({ up: false, down: true, a: false, b: false }); // down
    expect(c.stage).toBe(1);
    c.update({ up: true, down: false, a: false, b: false });
    c.update({ up: true, down: false, a: false, b: false });
    c.update({ up: true, down: false, a: false, b: false });
    expect(c.stage).toBe(3); // clamped at stageCount
  });

  it('closes the menu with B (button 1)', () => {
    const c = new CheatState(29);
    const action = c.update({ up: false, down: false, a: false, b: true });
    expect(action).toBe('close');
  });

  it('has exactly three menu entries', () => {
    expect(CHEAT_MENU).toEqual(['STAGE SELECT', 'GOD MODE', 'ONE PUNCH']);
  });
});
