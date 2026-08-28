import { GameConfig } from '../dsl/config';
import { Stage } from '../dsl/stages';
import { GameSpec } from '../dsl/game-spec';
import { Fighter, GameContext, FallingState, WeaponLike } from './fighter';
import { Player } from './player';
import { Enemy } from './enemy';
import { EnemyVax, EnemyHoodie, EnemyScooterboy, EnemyBoss, EnemyPortal, Scooter } from './enemies';
import { CheatState } from './cheat';
import { Barrel, Stick, Chain, Weapon } from './weapons';
import { HealthPowerup, ExtraLifePowerup, Powerup } from './powerups';
import { ControllerInput } from '../core/controller';
import { Vec2, clamp } from '../core/math';
import { Rng, systemRng, TracingRng } from '../core/prng';

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
  powerups: Powerup[] = [];
  scooters: Scooter[] = [];
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
  /** The shared RNG all randomness flows through (seeded for deterministic replays). */
  rng: Rng;

  private stages: Stage[];
  private attacks: GameSpec['attacks'];
  private characters: GameSpec['characters'];
  private story: GameSpec['story'];
  private soundsPlayed: string[] = [];
  private introText = '';
  private outroText = '';
  /** RNG draws trace (present only when `opts.debugRng` is set). */
  rngTrace: TracingRng | null = null;
  /**
   * Pre-drawn world RNG, indexed by stage: one colour_variant per colour-drawing
   * enemy and one durability per stick/chain, in the stage's literal enemy-then-
   * weapon order. Drawn in the Game ctor BEFORE the stolen-item choice to mirror the
   * Python game's `setup_stages()` (all stages are pre-built at construction).
   */
  private preDrawnWorld: { colours: number[]; durabilities: number[] }[] = [];

  constructor(
    spec: GameSpec,
    controls: ControllerInput,
    opts: { rng?: Rng; debugRng?: boolean } = {},
  ) {
    this.rng = opts.rng ?? systemRng;
    if (opts.debugRng) {
      this.rngTrace = new TracingRng(this.rng);
      this.rng = this.rngTrace;
    }
    this.config = spec.config;
    this.attacks = spec.attacks;
    this.characters = spec.characters;
    this.story = spec.story;
    this.stages = spec.stages.stages;
    this.cheatState = new CheatState(this.stages.length);
    this.player = new Player(this, controls);
    this.boundary = { left: 0, top: this.config.MIN_WALK_Y, right: this.config.WIDTH - 1, bottom: this.config.HEIGHT - 1 };
    this.textActive = spec.config.INTRO_ENABLED;
    // Mirror the Python game's Game.__init__ draw order:
    //   1. setup_stages() pre-builds EVERY stage's colour variants + weapon
    //      durabilities (Python: EnemyVax/Hoodie/Scooterboy/Boss colour_variant
    //      randint(0,2), Stick/Chain durability).
    //   2. THEN the stolen-item choice for the intro text.
    // (The web used to draw the stolen-item choice FIRST — reordered here.)
    this.preDrawWorldRng();
    // Intro/outro story text (data-driven from story.json).
    const stolen = this.rng.choice(this.story.stolen_items) ?? '';
    this.introText = this.story.intro_prefix + stolen + this.story.intro_suffix;
    this.outroText = this.story.outro;
    if (this.textActive) {
      this.currentText = this.introText;
      this.displayedText = '';
    }
  }

  /**
   * Consume the world-setup RNG draws Python makes at Game construction. Iterates
   * every stage (enemies first, then weapons — the Python Stage literal order),
   * drawing one `randint(0,2)` colour_variant for each colour-bearing enemy and one
   * durability for each stick/chain. Stored per stage so a lazily-built stage reuses
   * its pre-drawn values (no re-draw) — matching Python, which pre-builds all stages.
   */
  private preDrawWorldRng(): void {
    for (const stage of this.stages) {
      const colours: number[] = [];
      const durabilities: number[] = [];
      for (const e of stage.enemies) {
        if (isColourVariantEnemy(e.type)) colours.push(this.rng.randint(0, 2));
      }
      for (const w of stage.weapons) {
        if (w.type === 'Stick') durabilities.push(this.rng.randint(12, 16));
        else if (w.type === 'Chain') durabilities.push(this.rng.randint(18, 25));
      }
      this.preDrawnWorld.push({ colours, durabilities });
    }
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
    // Mirror Python `get_sound → randint(0, count-1)`: EVERY sound draw consumes a
    // variant from the game's RNG — including count-1 sounds (randint(0,0)) and
    // sounds from off-screen/inaudible events. Selection is decoupled from playback
    // so the draw still happens when audio is muted/unavailable (headless e2e has no
    // AudioContext; Python's mixer is in try/except too).
    const variant = this.rng.randint(0, variants - 1);
    this.soundsPlayed.push(variants > 1 ? `${name}${variant}` : name);
    void variant;
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
      this.currentText = this.outroText;
      this.displayedText = '';
      this.timer = 0;
    }
  }

  checkWon(): boolean {
    return this.stageIndex >= this.stages.length && !this.textActive;
  }

  private createStageObjects(stage: Stage): void {
    const pre = this.preDrawnWorld[this.stageIndex] ?? { colours: [], durabilities: [] };
    const enemies: Enemy[] = [];
    for (const e of stage.enemies) {
      // Reuse the colour variant pre-drawn at construction (matching Python, which
      // pre-builds every stage at Game init). Portal spawns draw live instead.
      const colour = isColourVariantEnemy(e.type) ? pre.colours.shift() : undefined;
      const enemy = this.buildEnemy(e, colour);
      if (enemy) enemies.push(enemy);
    }
    this.enemies = enemies;
    for (const enemy of this.enemies) enemy.spawned();
    // Reset weapons/powerups to this stage's spawns.
    this.weapons = [];
    this.powerups = [];
    this.addStageWorldObjects(stage, pre.durabilities);
  }

  private addStageWorldObjects(stage: Stage, durabilities: number[] = []): void {
    for (const w of stage.weapons) {
      const weapon = this.buildWeapon(w, w.type === 'Stick' || w.type === 'Chain' ? durabilities.shift() : undefined);
      if (weapon) this.weapons.push(weapon);
    }
    for (const p of stage.powerups) {
      const powerup = this.buildPowerup(p);
      if (powerup) this.powerups.push(powerup);
    }
  }

  /** Build a weapon from a stage entity (Barrel / Stick / Chain). */
  private buildWeapon(e: SpawnEntry, durability?: number): WeaponLike | null {
    const pos = new Vec2(Number(e.pos[0]), e.pos[1] === 'MIN_WALK_Y' ? this.config.MIN_WALK_Y : Number(e.pos[1]));
    switch (e.type) {
      case 'Barrel':
        return new Barrel(this, pos);
      case 'Stick':
        return new Stick(this, pos, durability);
      case 'Chain':
        return new Chain(this, pos, durability);
      default:
        return null;
    }
  }

  /** Build a powerup from a stage entity (Health / ExtraLife). */
  private buildPowerup(e: SpawnEntry): Powerup | null {
    const pos = new Vec2(Number(e.pos[0]), e.pos[1] === 'MIN_WALK_Y' ? this.config.MIN_WALK_Y : Number(e.pos[1]));
    switch (e.type) {
      case 'HealthPowerup':
        return new HealthPowerup(this, pos);
      case 'ExtraLifePowerup':
        return new ExtraLifePowerup(this, pos);
      default:
        return null;
    }
  }

  /**
   * Build an enemy from a stage entity, resolving MIN_WALK_Y positions. `colourVariant`
   * is the value pre-drawn at Game construction (for stage-defined enemies); when
   * omitted (portal spawns) the enemy draws its own live colour_variant, matching
   * Python's spawn-time `randint(0,2)`.
   */
  private buildEnemy(e: SpawnEntry, colourVariant?: number): Enemy | null {
    const name = e.type;
    const char = this.characters.characters[name.toLowerCase().replace('enemy', '')];
    if (!char) return null;
    const pos = new Vec2(
      Number(e.pos[0]),
      e.pos[1] === 'MIN_WALK_Y' ? this.config.MIN_WALK_Y : Number(e.pos[1]),
    );
    const common = { startTimer: e.start_timer, colourVariant };
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
    if (this.rngTrace) this.rngTrace.frame = this.timer;

    if (this.textActive) {
      this.updateText();
      return;
    }

    // Update all objects.
    this.player.update();
    for (const e of this.enemies) e.update();
    for (const w of this.weapons) if (w instanceof Weapon) w.update();
    for (const p of this.powerups) p.update();
    for (const s of this.scooters) s.update();

    // Spawn a lone scooter when a knocked-off scooterboy finishes the knock-off frame.
    for (const e of this.enemies) {
      if (e instanceof EnemyScooterboy && e.justKnockedOffScooter && e.frame > 10) {
        e.justKnockedOffScooter = false;
        this.scooters.push(new Scooter(this, e.vpos.clone(), e.facingX, e.colourVariant ?? 0));
      }
    }

    // Player collects powerups within reach.
    this.collectPowerups();

    this.updateScrolling();

    // Score and remove dead enemies.
    for (const e of this.enemies) {
      if (e.lives <= 0) this.score += e instanceof Enemy ? e.score : 0;
    }
    this.enemies = this.enemies.filter((e) => e.lives > 0);

    // Remove broken weapons and ones off the left of the screen.
    this.weapons = this.weapons.filter((w) => !w.is_broken() && w.vpos.x > -200);
    // Remove collected powerups and ones off the left of the screen.
    this.powerups = this.powerups.filter((p) => !p.collected && p.vpos.x > -200);

    // Advance to next stage when empty and fully scrolled.
    if (this.enemies.length === 0 && this.scrollOffset.x === this.maxScrollOffsetX) {
      this.nextStage();
    }
  }

  private collectPowerups(): void {
    for (const p of this.powerups) {
      if (!p.collected && p.vpos.sub(this.player.vpos).length() < 30) {
        p.collect(this.player);
      }
    }
  }

  private updateText(): void {
    if (this.timer % 6 === 0 && this.displayedText.length < this.currentText.length) {
      const lengthToDisplay = Math.min(Math.floor(this.timer / 6), this.currentText.length);
      this.displayedText = this.currentText.slice(0, lengthToDisplay);
      // Teletype sound when a visible (non-space) character is added.
      const lastChar = this.displayedText[this.displayedText.length - 1];
      if (lastChar && !/\s/.test(lastChar)) this.playSound('teletype');
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

  /** The intro story text (for rendering during the opening scene). */
  getIntroText(): string {
    return this.introText;
  }

  /** The outro story text shown after the final stage. */
  getOutroText(): string {
    return this.outroText;
  }
}

/**
 * Enemy types that draw a `colour_variant` (`randint(0,2)`) at construction in the
 * Python game (vax/hoodie/scooterboy/boss). Portals do not. Used by the world
 * pre-draw pass so the web consumes the same colour-variant draws Python does in
 * `setup_stages()`.
 */
function isColourVariantEnemy(type: string): boolean {
  return type === 'EnemyVax' || type === 'EnemyHoodie' || type === 'EnemyScooterboy' || type === 'EnemyBoss';
}
