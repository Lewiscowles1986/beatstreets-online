import { clamp } from '../core/math';

/**
 * The cheat system for Beat Streets. When the Konami code is entered during play the
 * game pauses and a cheat menu is shown. The three cheats are toggled/activated there:
 *   * STAGE SELECT — jump straight to any stage.
 *   * GOD MODE     — the player never takes damage.
 *   * ONE PUNCH    — any player->enemy hit kills the enemy outright.
 *
 * This is pure state + menu-navigation logic (no rendering), ported from the Python
 * game's cheat-menu update (`_update_cheat_menu`).
 */

export interface CheatSettings {
  godMode: boolean;
  onePunch: boolean;
}

/** Menu entries, in display order. */
export const CHEAT_MENU = ['STAGE SELECT', 'GOD MODE', 'ONE PUNCH'] as const;
export type CheatMenuItem = (typeof CHEAT_MENU)[number];

export type CheatAction = 'none' | 'select' | 'close';

/** The menu can be navigating normally, or choosing a stage in STAGE SELECT. */
export type CheatMode = 'menu' | 'stage-select';

export class CheatState {
  cursor = 0;
  stage = 1;
  mode: CheatMode = 'menu';
  settings: CheatSettings = { godMode: false, onePunch: false };

  constructor(
    private readonly stageCount: number,
    private readonly minStage = 1,
  ) {}

  /** The currently highlighted menu item label (or null in stage-select). */
  get selectedItem(): CheatMenuItem | null {
    if (this.mode !== 'menu') return null;
    return CHEAT_MENU[this.cursor] ?? null;
  }

  /** True if the menu should remain visible (not close). */
  isOpen(): boolean {
    return true;
  }

  /**
   * Advance the cheat menu with direction + button inputs. Mirrors the Python
   * `_update_cheat_menu`: UP/DOWN move the cursor (or change stage), A (button 0)
   * selects, B (button 1) backs out.
   *
   * @returns an action the caller acts on ('select' when stage chosen / toggled,
   *   'close' when the menu is closed).
   */
  update(input: { up: boolean; down: boolean; a: boolean; b: boolean }): CheatAction {
    if (this.mode === 'stage-select') {
      if (input.up) this.stage = clamp(this.stage + 1, this.minStage, this.stageCount);
      if (input.down) this.stage = clamp(this.stage - 1, this.minStage, this.stageCount);
      if (input.a) {
        this.mode = 'menu';
        return 'select'; // stage chosen -> caller jumps to this.stage
      }
      if (input.b) {
        this.mode = 'menu';
        return 'none';
      }
      return 'none';
    }

    // menu mode
    if (input.up) this.cursor = (this.cursor - 1 + CHEAT_MENU.length) % CHEAT_MENU.length;
    if (input.down) this.cursor = (this.cursor + 1) % CHEAT_MENU.length;

    if (input.a) {
      switch (this.selectedItem) {
        case 'STAGE SELECT':
          this.mode = 'stage-select';
          this.stage = clamp(this.stage, this.minStage, this.stageCount);
          return 'none';
        case 'GOD MODE':
          this.settings.godMode = !this.settings.godMode;
          return 'select';
        case 'ONE PUNCH':
          this.settings.onePunch = !this.settings.onePunch;
          return 'select';
        default:
          return 'none';
      }
    }
    if (input.b) return 'close';
    return 'none';
  }

  reset(): void {
    this.cursor = 0;
    this.stage = 1;
    this.mode = 'menu';
  }
}
