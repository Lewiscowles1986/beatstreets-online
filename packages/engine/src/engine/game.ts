import { GameConfig } from '../dsl/config';
import { Stage } from '../dsl/stages';
import { GameSpec } from '../dsl/game-spec';
import { Fighter, GameContext, FallingState, WeaponLike } from './fighter';
import { Player } from './player';
import { Enemy } from './enemy';
import { EnemyVax, EnemyHoodie, EnemyScooterboy, EnemyBoss, EnemyPortal } from './enemies';
import { CheatState } from './cheat';
import { ControllerInput } from '../core/controller';
import { Vec2, clamp } from '../core/math';

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A spawn record for an entity within a stage (positions may use MIN_WALK_Y). */
export interface SpawnEntry {
  type: string;
  pos: Array<number | string>;
  spawns?: string[];
  spawn_interval?: number;
  spawn_interval_change?: number;
  max_spawn_interval?: number;
  max_enemies?: number;
  start_timer?: number;
}

/**
 * The Game engine: owns the player, the current stage's enemies/weapons/powerups,
 * scrolling, spawning, and scoring. Renders nothing directly — a render layer reads
 * its world. Pure enough to be driven and asserted by acceptance tests.
 */
export class Game implements GameContext {
  config: GameConfig;
  player: Player;
  enemies: Fighter[] = [];
  weapons: WeaponLike[] = [];
  powerups: { vpos: Vec2; collected: boolean; collect(c: { health: number; startHealth: number; gainExtraLife(): void }): void }[] = [];
  stageIndex = -1;
  timer = 0;
  score = 0;
  scrollOffset = new Vec2(0, 0);
  maxScrollOffsetX = 0;
  scrolling = false;
  boundary: Rect;
  textActive: boolean;
  currentText = '';
  displayedText = '';
  outroActive = false;
  won = false;
  cheatState = new CheatState(0);

  private stages: Stage[];
  private attacks: GameSpec['attacks'];
  private characters: GameSpec['characters'];
  private soundsPlayed: string[] = [];

  constructor(
    spec: GameSpec,
    controls: ControllerInput,
  ) {
    this.config = spec.config;
    this.attacks = spec.attacks;
    this.characters = spec.characters;
    this.stages = spec.stages.stages;
    this.cheatState = new CheatState(this.stages.length);
    this.player = new Player(this, controls);
    this.boundary = { left: 0, top: this.config.MIN_WALK_Y, right: this.config.WIDTH - 1, bottom: this.config.HEIGHT - 1 };
    this.textActive = spec.config.INTRO_ENABLED;
  }

  // -- GameContext -----------------------------------------------------

  getEnemies(): Fighter[] {
    return this.enemies;
  }

  getPlayer(): Fighter {
    return this.player;
  }

  getAttack(name: string) {
    return this.attacks[name];
  }

  playSound(name: string, variants = 1): void {
    this.soundsPlayed.push(name);
    void variants;
  }

  scrollX(): number {
    return this.scrollOffset.x;
  }

  cheat(): { godMode: boolean; onePunch: boolean } {
    return this.cheatState.settings;
  }

  /** Spawn a named enemy (used by portals). */
  spawnEnemy(name: string, pos: Vec2): void {
    const enemy = this.buildEnemy({ type: name, pos: [pos.x, pos.y] });
    if (enemy) {
      this.enemies.push(enemy);
      enemy.spawned();
    }
  }

  // -- game flow -------------------------------------------------------

  nextStage(): void {
    this.stageIndex += 1;
    if (this.stageIndex < this.stages.length) {
      const stage = this.stages[this.stageIndex];
      this.maxScrollOffsetX = stage.max_scroll_x;
      if (this.scrolling || this.maxScrollOffsetX <= this.scrollOffset.x) {
        this.createStageObjects(stage);
      }
    } else if (!this.outroActive) {
      this.outroActive = true;
      this.textActive = true;
      this.timer = 0;
    }
  }

  checkWon(): boolean {
    return this.stageIndex >= this.stages.length && !this.textActive;
  }

  private createStageObjects(stage: Stage): void {
    const enemies: Enemy[] = [];
    for (const e of stage.enemies) {
      const enemy = this.buildEnemy(e);
      if (enemy) enemies.push(enemy);
    }
    this.enemies = enemies;
    for (const enemy of this.enemies) enemy.spawned();
    // Weapons/powerups are represented minimally for now (see buildWorld).
    this.addStageWorldObjects(stage);
  }

  private addStageWorldObjects(stage: Stage): void {
    // Placeholder hook: full weapon/powerup physics come in a later increment.
    void stage;
  }

  /** Build an enemy from a stage entity, resolving MIN_WALK_Y positions. */
  private buildEnemy(e: SpawnEntry): Enemy | null {
    const name = e.type;
    const char = this.characters.characters[name.toLowerCase().replace('enemy', '')];
    if (!char) return null;
    const pos = new Vec2(
      Number(e.pos[0]),
      e.pos[1] === 'MIN_WALK_Y' ? this.config.MIN_WALK_Y : Number(e.pos[1]),
    );
    const common = { startTimer: e.start_timer };
    switch (name) {
      case 'EnemyVax':
        return new EnemyVax(this, char, pos, common);
      case 'EnemyHoodie':
        return new EnemyHoodie(this, char, pos, common);
      case 'EnemyScooterboy':
        return new EnemyScooterboy(this, char, pos, common);
      case 'EnemyBoss':
        return new EnemyBoss(this, char, pos, common);
      case 'EnemyPortal':
        return new EnemyPortal(this, char, pos, {
          startTimer: e.start_timer,
          spawns: e.spawns,
          spawnInterval: e.spawn_interval,
          spawnIntervalChange: e.spawn_interval_change,
          maxSpawnInterval: e.max_spawn_interval,
          maxEnemies: e.max_enemies,
        });
      default:
        return null;
    }
  }

  /** Jump straight to a (1-based) stage — the stage-select cheat. */
  jumpToStage(stageNumber: number): void {
    const index = clamp(stageNumber, 1, this.stages.length) - 1;
    const stage = this.stages[index];
    this.stageIndex = index;
    this.maxScrollOffsetX = stage.max_scroll_x;
    this.scrolling = false;
    this.textActive = false;
    this.timer = 0;
    this.weapons = [];
    this.createStageObjects(stage);
    this.player.vpos = new Vec2(400, 400);
    this.player.health = this.player.startHealth;
    this.player.stamina = this.player.maxStamina;
    this.player.fallingState = FallingState.STANDING;
  }

  update(): void {
    this.timer += 1;

    if (this.textActive) {
      this.updateText();
      return;
    }

    // Update all objects.
    this.player.update();
    for (const e of this.enemies) e.update();

    this.updateScrolling();

    // Score and remove dead enemies.
    for (const e of this.enemies) {
      if (e.lives <= 0) this.score += e instanceof Enemy ? e.score : 0;
    }
    this.enemies = this.enemies.filter((e) => e.lives > 0);

    // Advance to next stage when empty and fully scrolled.
    if (this.enemies.length === 0 && this.scrollOffset.x === this.maxScrollOffsetX) {
      this.nextStage();
    }
  }

  private updateText(): void {
    if (this.timer % 6 === 0 && this.displayedText.length < this.currentText.length) {
      this.displayedText = this.currentText.slice(0, this.timer / 6);
    }
    // Player skips text with any button press.
    for (let b = 0; b < 4; b++) {
      if (this.player.controls.pressed(b as 0 | 1 | 2 | 3)) {
        this.textActive = false;
        this.timer = 0;
      }
    }
  }

  private updateScrolling(): void {
    if (this.scrolling) {
      if (this.scrollOffset.x < this.maxScrollOffsetX) {
        const diff = this.maxScrollOffsetX - this.scrollOffset.x;
        let speed = this.player.vpos.x - this.scrollOffset.x;
        if (speed < 0) speed = 0;
        speed = Math.min(diff, speed);
        this.scrollOffset.x += speed;
        this.boundary.left = this.scrollOffset.x;
      } else {
        this.scrolling = false;
      }
    } else {
      const begin = this.config.WIDTH - 300;
      if (
        this.player.vpos.x - this.scrollOffset.x > begin &&
        this.scrollOffset.x < this.maxScrollOffsetX
      ) {
        this.scrolling = true;
        if (this.stageIndex < this.stages.length) {
          this.createStageObjects(this.stages[this.stageIndex]);
        }
      }
    }
  }

  // -- introspection for tests/render ----------------------------------

  sounds(): string[] {
    return [...this.soundsPlayed];
  }

  stageCount(): number {
    return this.stages.length;
  }
}
