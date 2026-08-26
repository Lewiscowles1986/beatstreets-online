import { useEffect, useRef } from 'react';
import { Game, Scene, SceneManager, KonamiDetector, Barrel, Stick, Chain, HealthPowerup, ExtraLifePowerup } from '@beatstreets/engine';
import { loadGameSpec } from '../game/data';
import { CanvasRender } from '../game/render/canvas-render';
import { WebGLRender } from '../game/render/webgl-render';
import { SPRITES } from '../game/assets';
import { useSpriteAssets } from './useSpriteAssets';

export interface GameCanvasProps {
  /** The (1-based) stage to start on. */
  stage?: number;
  width?: number;
  height?: number;
  debug?: boolean;
  /** Force the 2D renderer even when WebGL is available. */
  forceCanvas2D?: boolean;
}

/**
 * The playable game host. It owns a live {@link Game}, drives it via a
 * {@link SceneManager} (title -> play -> game-over), and renders each frame with the
 * WebGL backend (falling back to Canvas 2D when WebGL is unavailable). This is the
 * real app surface the shell mounts. Sprites are preloaded first.
 */
export function GameCanvas({ stage = 1, width = 800, height = 480, debug = false, forceCanvas2D = false }: GameCanvasProps) {
  const { ready } = useSpriteAssets();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<Host | null>(null);
  if (hostRef.current === null) {
    hostRef.current = new Host(width, height, stage, debug, forceCanvas2D);
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Attach (and size) the canvas once sprites are ready and it is mounted.
    host.attach(canvasRef.current);
    let raf = 0;
    const step = () => {
      host.tick();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      host.detach();
    };
  }, [width, height, ready]);

  if (!ready) {
    return (
      <div
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'monospace' }}
        aria-busy="true"
        role="status"
      >
        loading sprites…
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="application"
      aria-label={`Beat Streets game, stage ${stage}. Use arrow keys to move and space to attack.`}
    />
  );
}

type Renderer = CanvasRender | WebGLRender;

/** Wraps the engine Game + render backend behind a tiny scene manager. */
class Host {
  private width: number;
  private height: number;
  private stage: number;
  private debug: boolean;
  private game: Game;
  private sceneManager = new SceneManager();
  private render: Renderer | null = null;
  private titleFrame = 0;
  private isWebGL = false;
  private konami = new KonamiDetector();
  private controls: DisposableControls;
  private lastDirections: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  // Pause / cheat menu cursor state.
  private pauseCursor = 0;
  private cheatJustOpened = false;
  private pauseJustOpened = false;

  constructor(width: number, height: number, stage: number, debug: boolean, forceCanvas2D: boolean) {
    this.width = width;
    this.height = height;
    this.stage = stage;
    this.debug = debug;
    this.isWebGL = !forceCanvas2D;
    this.controls = makeKeyboardControls();
    this.game = new Game(loadGameSpec(), this.controls);

    const title = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        this.h.titleFrame += 1;
        if (this.h.anyButtonPressed()) this.h.toControls();
      }
      draw() {
        this.h.drawTitle();
      }
    })(this);
    const controlsScene = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        if (this.h.anyButtonPressed()) this.h.startPlay();
      }
      draw() {
        this.h.drawControls();
      }
    })(this);
    const play = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        this.h.game.update();
        // Gather fresh inputs for the Konami detector + pause.
        const tokens = this.h.collectCheatTokens();
        if (this.h.game.checkWon() || this.h.game.player.lives <= 0) {
          this.h.endGame();
          return;
        }
        this.h.handlePlayTokens(tokens);
      }
      draw() {
        this.h.drawGame();
      }
    })(this);
    const pause = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        this.h.updatePause();
      }
      draw() {
        this.h.drawPause();
      }
    })(this);
    const cheat = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        this.h.updateCheat();
      }
      draw() {
        this.h.drawCheat();
      }
    })(this);
    const over = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        if (this.h.anyButtonPressed()) this.h.toTitle();
      }
      draw() {
        this.h.drawGameOver();
      }
    })(this);

    this.sceneManager.add('title', title);
    this.sceneManager.add('controls', controlsScene);
    this.sceneManager.add('play', play);
    this.sceneManager.add('pause', pause);
    this.sceneManager.add('cheat', cheat);
    this.sceneManager.add('game-over', over);
    this.sceneManager.switch('title');
  }

  attach(canvas: HTMLCanvasElement | null): void {
    this.render = null; // rebuild bound to the real canvas
    if (!canvas) return;
    // Size the canvas backing store (and CSS size) so it isn't the 300x150 default.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.width * dpr;
    canvas.height = this.height * dpr;
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    if (this.isWebGL) {
      try {
        this.render = new WebGLRender(canvas, this.width, this.height);
        return;
      } catch {
        this.isWebGL = false;
      }
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render = new CanvasRender(ctx, this.width, this.height);
  }

  detach(): void {
    this.render = null;
  }

  anyButtonPressed(): boolean {
    return this.game.player.controls.pressed(0) || this.game.player.controls.pressed(1);
  }

  toControls(): void {
    this.sceneManager.switch('controls');
  }

  startPlay(): void {
    this.sceneManager.switch('play');
    this.game = new Game(loadGameSpec(), this.controls);
    this.game.jumpToStage(this.stage);
    this.konami.reset();
    this.pauseCursor = 0;
    this.cheatJustOpened = false;
    this.pauseJustOpened = false;
  }

  endGame(): void {
    this.sceneManager.switch('game-over');
  }

  toTitle(): void {
    this.sceneManager.switch('title');
    this.game = new Game(loadGameSpec(), this.controls);
    this.konami.reset();
  }

  /** Edge-detect the four directions and map them to Konami tokens for this frame. */
  collectCheatTokens(): string[] {
    const dirs = this.controls.directions();
    const tokens: string[] = [];
    const names = ['up', 'down', 'left', 'right'];
    for (let i = 0; i < 4; i++) {
      if (dirs[i] && !this.lastDirections[i]) tokens.push(names[i]);
    }
    this.lastDirections = dirs;
    return tokens;
  }

  /** Feed cheat tokens + A/B into the Konami detector; ESC opens pause. */
  handlePlayTokens(tokens: string[]): void {
    // A (button 0) / B (button 1) also feed the code.
    if (this.controls.pressed(0)) tokens.push('a');
    if (this.controls.pressed(1)) tokens.push('b');
    if (this.controls.escPressed()) tokens.push('escape');

    if (this.konami.feedMany(tokens)) {
      this.sceneManager.switch('cheat');
      this.cheatJustOpened = true;
      this.game.cheatState.reset();
      return;
    }
    if (tokens.includes('escape')) {
      this.sceneManager.switch('pause');
      this.pauseCursor = 0;
      this.pauseJustOpened = true;
    }
  }

  updatePause(): void {
    if (this.pauseJustOpened) {
      this.pauseJustOpened = false;
      return;
    }
    const up = this.controls.rawPressed('ArrowUp');
    const down = this.controls.rawPressed('ArrowDown');
    if (up) this.pauseCursor = (this.pauseCursor - 1 + 2) % 2;
    if (down) this.pauseCursor = (this.pauseCursor + 1) % 2;
    if (this.controls.pressed(0)) {
      if (this.pauseCursor === 0) this.sceneManager.switch('play'); // RESUME
      else this.toTitle(); // QUIT
    }
    if (this.controls.escPressed()) this.sceneManager.switch('play');
  }

  updateCheat(): void {
    if (this.cheatJustOpened) {
      this.cheatJustOpened = false;
      return;
    }
    const action = this.game.cheatState.update({
      up: this.controls.rawPressed('ArrowUp'),
      down: this.controls.rawPressed('ArrowDown'),
      a: this.controls.pressed(0),
      b: this.controls.pressed(1),
    });
    if (action === 'close') {
      this.sceneManager.switch('play');
    } else if (action === 'select' && this.game.cheatState.selectedItem === null) {
      // Stage select chosen a stage.
      this.game.jumpToStage(this.game.cheatState.stage);
    }
  }

  tick(): void {
    this.sceneManager.update();
    this.present();
  }

  private drawWorld(render: Renderer): void {
    this.drawBackground(render);
    const objs = [this.game.player, ...this.game.enemies].sort((a, b) => a.vpos.y - b.vpos.y);
    for (const o of objs) {
      render.blitSprite(o.determineSprite(), o.vpos.x - this.game.scrollOffset.x, o.vpos.y);
      if (this.debug) render.drawCircle(o.vpos.x - this.game.scrollOffset.x, o.vpos.y, 5, '#ff0');
    }
    // Weapons (barrels / stick / chain).
    for (const w of this.game.weapons) {
      const sprite = weaponSprite(w);
      if (sprite) render.blitSprite(sprite, w.vpos.x - this.game.scrollOffset.x, w.vpos.y);
    }
    // Powerups.
    for (const p of this.game.powerups) {
      const sprite = powerupSprite(p);
      if (sprite) render.blitSprite(sprite, p.vpos.x - this.game.scrollOffset.x, p.vpos.y);
    }
    // Scrolling arrow: shows when the stage can still scroll forward.
    if (this.game.scrollOffset.x < this.game.maxScrollOffsetX && (this.game.timer / 30 | 0) % 2 === 0) {
      render.blitSprite('arrow', this.width - 450, 120, ['left', 'top']);
    }
    render.drawText(`Stage ${this.game.stageIndex + 1} · HP ${this.game.player.health} · score ${this.game.score}`, 8, this.height - 20, false, '#9ad0ff');
  }

  /** Draw the scrolling road + repeating background tiles (draw_background port). */
  private drawBackground(render: Renderer): void {
    const cfg = this.game.config;
    const WIDTH = cfg.WIDTH;
    // Two copies of the road, wrapped by scroll offset.
    const road1x = -(this.game.scrollOffset.x % WIDTH);
    render.blitSprite('road', road1x, 0, ['left', 'top']);
    render.blitSprite('road', road1x + WIDTH, 0, ['left', 'top']);
    // Background tiles laid out left->right across the level.
    let posX = -this.game.scrollOffset.x - cfg.BACKGROUND_TILE_SPACING;
    for (const tile of cfg.BACKGROUND_TILES) {
      if (posX + 417 >= 0) {
        render.blitSprite(tile, posX, 0, ['left', 'top']);
        posX += cfg.BACKGROUND_TILE_SPACING;
        if (posX >= WIDTH) break;
      } else {
        posX += cfg.BACKGROUND_TILE_SPACING;
      }
    }
  }

  present(): void {
    const render = this.render;
    if (!render) return;
    this.sceneManager.draw();
    if (render instanceof WebGLRender) render.present();
  }

  drawTitle(): void {
    const render = this.render;
    if (!render) return;
    render.clear('#000');
    const logo = this.titleFrame % 40 < 20 ? 'title0' : 'title1';
    if (SPRITES[logo]) render.blitSprite(logo, this.width / 2, this.height / 2);
    render.drawText('PRESS SPACE OR Z', this.width / 2, this.height - 50, true, '#fff');
  }

  drawGame(): void {
    const render = this.render;
    if (!render) return;
    this.drawWorld(render);
    // Intro/outro story text overlay (typewriter).
    if (this.game.textActive) {
      render.fillRect(0, 0, this.width, this.height, 'rgba(0,0,0,0.85)');
      render.drawText(this.game.displayedText, 50, 50, false, '#fff');
    }
  }

  drawControls(): void {
    const render = this.render;
    if (!render) return;
    render.clear('#000');
    render.drawText('CONTROLS', this.width / 2, 100, true, '#fff');
    render.drawText('MOVE  ARROWS / WASD', this.width / 2, 170, true, '#9ad0ff');
    render.drawText('PUNCH  SPACE / Z', this.width / 2, 200, true, '#9ad0ff');
    render.drawText('KICK  X', this.width / 2, 230, true, '#9ad0ff');
    render.drawText('ELBOW  C', this.width / 2, 260, true, '#9ad0ff');
    render.drawText('FLYING KICK  A', this.width / 2, 290, true, '#9ad0ff');
    render.drawText('PRESS SPACE TO START', this.width / 2, this.height - 60, true, '#fff');
  }

  drawGameOver(): void {
    const render = this.render;
    if (!render) return;
    render.clear('#000');
    const won = this.game.checkWon();
    render.drawText(won ? 'YOU WIN!' : 'GAME OVER', this.width / 2, this.height / 2 - 20, true, '#fff');
    render.drawText(`SCORE ${this.game.score}`, this.width / 2, this.height / 2 + 20, true, '#ffd24d');
    render.drawText('PRESS SPACE', this.width / 2, this.height - 60, true, '#fff');
  }

  drawPause(): void {
    const render = this.render;
    if (!render) return;
    this.drawWorld(render);
    render.fillRect(0, 0, this.width, this.height, 'rgba(0,0,0,0.7)');
    render.drawText('PAUSED', this.width / 2, 120, true, '#fff');
    const lines = ['RESUME', 'QUIT'];
    for (let i = 0; i < lines.length; i++) {
      const y = 200 + i * 60;
      if (i === this.pauseCursor) {
        render.fillRect(this.width / 2 - 120, y - 5, 240, 60, '#aa1e1e');
      }
      render.drawText(lines[i], this.width / 2, y, true, '#fff');
    }
    render.drawText('UP/DOWN SELECT   SPACE CONFIRM   ESC RESUME', this.width / 2, this.height - 40, true, '#9ad0ff');
  }

  drawCheat(): void {
    const render = this.render;
    if (!render) return;
    this.drawWorld(render);
    render.fillRect(0, 0, this.width, this.height, 'rgba(0,0,0,0.7)');
    const cs = this.game.cheatState;
    if (cs.mode === 'stage-select') {
      render.drawText('STAGE SELECT', this.width / 2, 120, true, '#fff');
      render.drawText(`STAGE ${String(cs.stage).padStart(2, '0')}`, this.width / 2, 210, true, '#ffd24d');
      render.drawText('UP/DOWN PICK   SPACE JUMP   X BACK', this.width / 2, 320, true, '#9ad0ff');
      return;
    }
    render.drawText('CHEAT MENU', this.width / 2, 80, true, '#fff');
    const lines = [
      'STAGE SELECT',
      `GOD MODE   - ${cs.settings.godMode ? 'ON' : 'OFF'}`,
      `ONE PUNCH  - ${cs.settings.onePunch ? 'ON' : 'OFF'}`,
    ];
    for (let i = 0; i < lines.length; i++) {
      const y = 170 + i * 60;
      if (i === cs.cursor) {
        render.fillRect(this.width / 2 - 150, y - 5, 300, 60, '#aa1e1e');
      }
      render.drawText(lines[i], this.width / 2, y, true, '#fff');
    }
    render.drawText('UP/DOWN SELECT   SPACE CONFIRM   X CLOSE', this.width / 2, this.height - 40, true, '#9ad0ff');
  }
}

interface DisposableControls {
  getX(): number;
  getY(): number;
  held(b: number): boolean;
  pressed(b: number): boolean;
  /** Fresh (edge) presses for a raw key name (e.g. 'ArrowUp', 'Escape'). */
  rawPressed(key: string): boolean;
  /** Current edge-detected [up, down, left, right] states. */
  directions(): [boolean, boolean, boolean, boolean];
  escPressed(): boolean;
  dispose(): void;
}

function makeKeyboardControls(): DisposableControls {
  const down = new Set<string>();
  const prev = new Set<string>();
  const map: Record<number, string[]> = { 0: [' '], 1: ['x'], 2: ['c'], 3: ['a'] };
  const keyFor = (b: number) => [...down].some((k) => map[b]?.includes(k));
  const onDown = (e: KeyboardEvent) => {
    down.add(e.code);
    down.add(e.key);
  };
  const onUp = (e: KeyboardEvent) => {
    down.delete(e.code);
    down.delete(e.key);
    prev.delete(e.code);
    prev.delete(e.key);
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  return {
    getX: () => (down.has('ArrowRight') || down.has('d') ? 1 : down.has('ArrowLeft') || down.has('a') ? -1 : 0),
    getY: () => (down.has('ArrowDown') || down.has('s') ? 1 : down.has('ArrowUp') || down.has('w') ? -1 : 0),
    held: keyFor,
    pressed: keyFor,
    rawPressed: (key: string) => {
      const was = prev.has(key);
      const is = down.has(key);
      prev.add(key);
      return is && !was;
    },
    directions: () => {
      const up = down.has('ArrowUp') || down.has('w');
      const dn = down.has('ArrowDown') || down.has('s');
      const lf = down.has('ArrowLeft') || down.has('a');
      const rt = down.has('ArrowRight') || down.has('d');
      return [up, dn, lf, rt];
    },
    escPressed: () => down.has('Escape'),
    dispose: () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
  };
}

/** A representative sprite for a weapon, or null if not applicable. */
function weaponSprite(w: unknown): string | null {
  if (w instanceof Barrel) return w.sprite();
  if (w instanceof Stick || w instanceof Chain) return w.spriteName;
  return null;
}

/** A representative sprite for a powerup. */
function powerupSprite(p: unknown): string | null {
  if (p instanceof ExtraLifePowerup) return p.sprite();
  if (p instanceof HealthPowerup) return p.spriteName;
  return null;
}
