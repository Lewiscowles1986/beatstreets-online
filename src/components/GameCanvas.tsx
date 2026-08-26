import { useEffect, useRef, useState } from 'react';
import { Game, Scene, SceneManager, KonamiDetector, Barrel, Stick, Chain, HealthPowerup, ExtraLifePowerup, WebSocketController } from '@beatstreets/engine';
import { loadGameSpec } from '../game/data';
import { CanvasRender } from '../game/render/canvas-render';
import { WebGLRender } from '../game/render/webgl-render';
import { useSpriteAssets } from './useSpriteAssets';
import { AudioController } from '../game/audio';
import { TitleScreen } from './scenes/TitleScreen';
import { ControlsScreen } from './scenes/ControlsScreen';
import { MenuOverlay } from './scenes/MenuOverlay';
import { GameOverScreen } from './scenes/GameOverScreen';
import { IntroOutroText } from './scenes/IntroOutroText';
import { CheatOverlay } from './scenes/CheatOverlay';

export interface GameCanvasProps {
  /** The (1-based) stage to start on. */
  stage?: number;
  width?: number;
  height?: number;
  debug?: boolean;
  /** Force the 2D renderer even when WebGL is available. */
  forceCanvas2D?: boolean;
  /** Optional WebSocket URL to drive the game remotely (WebSocketController). */
  wsUrl?: string;
}

/**
 * The playable game host. It owns a live {@link Game}, drives it via a
 * {@link SceneManager} (title -> play -> game-over), and renders each frame with the
 * WebGL backend (falling back to Canvas 2D when WebGL is unavailable). This is the
 * real app surface the shell mounts. Sprites are preloaded first.
 */
export function GameCanvas({ stage = 1, width = 800, height = 480, debug = false, forceCanvas2D = false, wsUrl }: GameCanvasProps) {
  const { ready } = useSpriteAssets();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<Host | null>(null);
  if (hostRef.current === null) {
    hostRef.current = new Host(width, height, stage, debug, forceCanvas2D, wsUrl);
  }
  const [ov, setOv] = useState(() => ({
    scene: 'title' as string,
    titleFrame: 0,
    pauseCursor: 0,
    score: 0,
    won: false,
    textActive: false,
    text: '',
    displayedText: '',
    timer: 0,
    cheatCursor: 0,
    cheatStage: 1,
    cheatStageSelect: false,
    godMode: false,
    onePunch: false,
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Attach (and size) the canvas once sprites are ready and it is mounted.
    host.attach(canvasRef.current);
    // Mirror the Host's render-relevant state into React so overlays render from state.
    const refresh = () => setOv(host.getOverlayState());
    host.setOnSceneChange(refresh);
    let raf = 0;
    const step = () => {
      host.tick();
      refresh();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      host.setOnSceneChange(null);
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

  const scene = ov.scene;

  return (
    <div style={{ position: 'relative', width, height }} data-scene={scene}>
      <canvas
        ref={canvasRef}
        role="application"
        aria-label={`Beat Streets game, stage ${stage}. Use arrow keys to move and space to attack.`}
      />
      {scene === 'title' && <TitleScreen width={width} height={height} frame={ov.titleFrame} />}
      {scene === 'controls' && <ControlsScreen width={width} height={height} />}
      {scene === 'pause' && (
        <MenuOverlay
          width={width}
          height={height}
          title="PAUSED"
          items={[{ label: 'RESUME' }, { label: 'QUIT' }]}
          cursor={ov.pauseCursor}
          hint="UP/DOWN SELECT   SPACE CONFIRM   ESC RESUME"
          ariaLabel="Pause menu"
        />
      )}
      {scene === 'cheat' && <CheatOverlay width={width} height={height} cursor={ov.cheatCursor} godMode={ov.godMode} onePunch={ov.onePunch} stageSelect={ov.cheatStageSelect} stage={ov.cheatStage} />}
      {scene === 'game-over' && <GameOverScreen width={width} height={height} won={ov.won} score={ov.score} />}
      {scene === 'play' && ov.textActive && (
        <IntroOutroText width={width} height={height} text={ov.text} displayedText={ov.displayedText} textActive={ov.textActive} timer={ov.timer} />
      )}
    </div>
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
  private audio = new AudioController();
  private lastDirections: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  // Pause / cheat menu cursor state.
  private pauseCursor = 0;
  private cheatJustOpened = false;
  private pauseJustOpened = false;
  private onSceneChange: (() => void) | null = null;

  /** Subscribe to scene transitions so React can render overlays. */
  setOnSceneChange(cb: (() => void) | null): void {
    this.onSceneChange = cb;
  }

  /** Current scene name (for the React overlay). */
  sceneName(): string {
    return this.sceneManager.current ?? 'title';
  }

  /** A plain snapshot of everything the React overlays need (no ref reads in render). */
  getOverlayState() {
    return {
      scene: this.sceneName(),
      titleFrame: this.titleFrame,
      pauseCursor: this.pauseCursor,
      score: this.game.score,
      won: this.game.checkWon(),
      textActive: this.game.textActive,
      text: this.game.currentText,
      displayedText: this.game.displayedText,
      timer: this.game.timer,
      cheatCursor: this.game.cheatState.cursor,
      cheatStage: this.game.cheatState.stage,
      cheatStageSelect: this.game.cheatState.mode === 'stage-select',
      godMode: this.game.cheatState.settings.godMode,
      onePunch: this.game.cheatState.settings.onePunch,
    };
  }

  private notifyScene(): void {
    this.onSceneChange?.();
  }

  constructor(width: number, height: number, stage: number, debug: boolean, forceCanvas2D: boolean, wsUrl?: string) {
    this.width = width;
    this.height = height;
    this.stage = stage;
    this.debug = debug;
    this.isWebGL = !forceCanvas2D;
    // Optionally attach a WebSocket controller (driven remotely).
    this.controls = makeControls(wsUrl ? createWebSocketController(wsUrl) : undefined);
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
    this.notifyScene();
  }

  startPlay(): void {
    this.sceneManager.switch('play');
    this.notifyScene();
    this.game = new Game(loadGameSpec(), this.controls);
    this.game.jumpToStage(this.stage);
    this.konami.reset();
    this.pauseCursor = 0;
    this.cheatJustOpened = false;
    this.pauseJustOpened = false;
    this.audio.playTheme();
  }

  endGame(): void {
    this.sceneManager.switch('game-over');
    this.notifyScene();
    this.audio.pauseTheme();
  }

  toTitle(): void {
    this.sceneManager.switch('title');
    this.notifyScene();
    this.game = new Game(loadGameSpec(), this.controls);
    this.konami.reset();
    this.audio.pauseTheme();
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
      this.notifyScene();
      this.cheatJustOpened = true;
      this.game.cheatState.reset();
      return;
    }
    if (tokens.includes('escape')) {
      this.sceneManager.switch('pause');
      this.notifyScene();
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
      this.notifyScene();
    }
    if (this.controls.escPressed()) this.sceneManager.switch('play');
    this.notifyScene();
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
    // Lone scooters (riders knocked off).
    for (const s of this.game.scooters) {
      render.blitSprite(s.sprite(), s.vpos.x - this.game.scrollOffset.x, s.vpos.y);
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
    // Rendered as a React overlay (TitleScreen) — clear the base canvas only.
    this.render?.clear('#000');
  }

  drawGame(): void {
    const render = this.render;
    if (!render) return;
    this.drawWorld(render);
    // Intro/outro text is rendered as a React overlay (IntroOutroText) when active.
  }

  drawControls(): void {
    // Rendered as a React overlay (ControlsScreen) — clear the base canvas only.
    this.render?.clear('#000');
  }

  drawGameOver(): void {
    // Rendered as a React overlay (GameOverScreen) — clear the base canvas only.
    this.render?.clear('#000');
  }

  drawPause(): void {
    // Rendered as a React overlay (MenuOverlay) — leave the paused world visible below.
    const render = this.render;
    if (render) this.drawWorld(render);
  }

  drawCheat(): void {
    // Rendered as a React overlay (CheatOverlay) — leave the world visible below.
    const render = this.render;
    if (render) this.drawWorld(render);
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

function makeControls(ws?: WebSocketController): DisposableControls {
  const kb = makeKeyboardControls();
  const pad = makeGamepadControls();
  // Merge: keyboard, gamepad and (optional) WebSocket all feed held/pressed/axis.
  const wsHeld = (b: number) => ws?.held(b as 0 | 1 | 2 | 3) ?? false;
  const wsPressed = (b: number) => ws?.pressed(b as 0 | 1 | 2 | 3) ?? false;
  return {
    getX: () => clampUnit(kb.getX() + pad.getX() + (ws?.getX() ?? 0)),
    getY: () => clampUnit(kb.getY() + pad.getY() + (ws?.getY() ?? 0)),
    held: (b: number) => kb.held(b) || pad.held(b) || wsHeld(b),
    pressed: (b: number) => kb.pressed(b) || pad.pressed(b) || wsPressed(b),
    rawPressed: (k: string) => kb.rawPressed(k),
    directions: () => kb.directions(),
    escPressed: () => kb.escPressed(),
    dispose: () => {
      kb.dispose();
      pad.dispose();
    },
  };
}

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

/** Create a WebSocketController attached to a browser WebSocket at the given URL. */
function createWebSocketController(url: string): WebSocketController {
  const socket = new WebSocket(url);
  const controller = new WebSocketController('websocket', socket as unknown as Parameters<WebSocketController['attach']>[0]);
  return controller;
}

/** Gamepad adapter: polls navigator.getGamepads() and maps to held/pressed/axis. */
function makeGamepadControls(): {
  getX(): number;
  getY(): number;
  held(b: number): boolean;
  pressed(b: number): boolean;
  dispose(): void;
} {
  const previous = [false, false, false, false];
  let current = { x: 0, y: 0, buttons: [false, false, false, false], pressed: [false, false, false, false] };
  let raf = 0;

  const poll = () => {
    let pad: RawGamepadLike | null = null;
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const list = navigator.getGamepads() as (RawGamepadLike | null)[];
      pad = list[0] ?? null;
    }
    const buttons = [0, 1, 2, 3].map((i) => pad?.buttons[i]?.pressed ?? false);
    current = {
      x: pad ? axisVal(pad.axes[0]) : 0,
      y: pad ? axisVal(pad.axes[1]) : 0,
      buttons,
      pressed: buttons.map((b, i) => b && !previous[i]),
    };
    previous.splice(0, 4, ...buttons);
    raf = requestAnimationFrame(poll);
  };
  raf = requestAnimationFrame(poll);

  return {
    getX: () => current.x,
    getY: () => current.y,
    held: (b: number) => current.buttons[b] ?? false,
    pressed: (b: number) => current.pressed[b] ?? false,
    dispose: () => cancelAnimationFrame(raf),
  };
}

function axisVal(v: number | undefined): number {
  if (v === undefined) return 0;
  if (Math.abs(v) < 0.6) return 0;
  return v > 0 ? 1 : -1;
}

type RawGamepadLike = { id: string; buttons: Array<{ pressed: boolean }>; axes: number[] };

function makeKeyboardControls(): DisposableControls {
  const down = new Set<string>();
  const prev = new Set<string>();
  const justPressed = new Set<number>();
  const map: Record<number, string[]> = { 0: [' '], 1: ['x'], 2: ['c'], 3: ['a'] };
  const keyFor = (b: number) => [...down].some((k) => map[b]?.includes(k));
  const buttonFor = (k: string): number | null => {
    for (const [b, keys] of Object.entries(map)) {
      if (keys.includes(k)) return Number(b);
    }
    return null;
  };
  const onDown = (e: KeyboardEvent) => {
    down.add(e.code);
    down.add(e.key);
    const b = buttonFor(e.key);
    if (b !== null) justPressed.add(b);
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
    // Rising-edge captured at keydown time so a quick tap between frames is never lost.
    pressed: (b: number) => {
      if (justPressed.has(b)) {
        justPressed.delete(b);
        return true;
      }
      return false;
    },
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
