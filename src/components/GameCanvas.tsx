import { useEffect, useRef } from 'react';
import { Game, Scene, SceneManager } from '@beatstreets/engine';
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
  }, [width, height]);

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

  constructor(width: number, height: number, stage: number, debug: boolean, forceCanvas2D: boolean) {
    this.width = width;
    this.height = height;
    this.stage = stage;
    this.debug = debug;
    this.isWebGL = !forceCanvas2D;
    this.game = new Game(loadGameSpec(), makeKeyboardControls());

    const title = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        this.h.titleFrame += 1;
        if (this.h.anyButtonPressed()) this.h.startPlay();
      }
      draw() {
        this.h.drawTitle();
      }
    })(this);
    const play = new (class extends Scene {
      constructor(private h: Host) {
        super();
      }
      update() {
        this.h.game.update();
        if (this.h.game.checkWon() || this.h.game.player.lives <= 0) this.h.endGame();
      }
      draw() {
        this.h.drawGame();
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
    this.sceneManager.add('play', play);
    this.sceneManager.add('game-over', over);
    this.sceneManager.switch('title');
  }

  attach(canvas: HTMLCanvasElement | null): void {
    this.render = null; // rebuild bound to the real canvas
    if (!canvas) return;
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
    this.render = new CanvasRender(ctx, this.width, this.height);
  }

  detach(): void {
    this.render = null;
  }

  anyButtonPressed(): boolean {
    return this.game.player.controls.pressed(0) || this.game.player.controls.pressed(1);
  }

  startPlay(): void {
    this.sceneManager.switch('play');
    this.game = new Game(loadGameSpec(), makeKeyboardControls());
    this.game.jumpToStage(this.stage);
  }

  endGame(): void {
    this.sceneManager.switch('game-over');
  }

  toTitle(): void {
    this.sceneManager.switch('title');
    this.game = new Game(loadGameSpec(), makeKeyboardControls());
  }

  tick(): void {
    this.sceneManager.update();
    this.present();
  }

  private drawWorld(render: Renderer): void {
    render.clear(this.isWebGL ? '#0d0d0d' : '#0d0d0d');
    const objs = [this.game.player, ...this.game.enemies].sort((a, b) => a.vpos.y - b.vpos.y);
    for (const o of objs) {
      render.blitSprite(o.determineSprite(), o.vpos.x - this.game.scrollOffset.x, o.vpos.y);
      if (this.debug) render.drawCircle(o.vpos.x - this.game.scrollOffset.x, o.vpos.y, 5, '#ff0');
    }
    render.drawText(`Stage ${this.game.stageIndex + 1} · HP ${this.game.player.health} · score ${this.game.score}`, 8, this.height - 20, false, '#9ad0ff');
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
    if (render) this.drawWorld(render);
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
}

interface DisposableControls {
  getX(): number;
  getY(): number;
  held(b: number): boolean;
  pressed(b: number): boolean;
  dispose(): void;
}

function makeKeyboardControls(): DisposableControls {
  const down = new Set<string>();
  const map: Record<number, string[]> = { 0: [' '], 1: ['x'], 2: ['c'], 3: ['a'] };
  const keyFor = (b: number) => [...down].some((k) => map[b]?.includes(k));
  const onDown = (e: KeyboardEvent) => {
    down.add(e.code);
    down.add(e.key);
  };
  const onUp = (e: KeyboardEvent) => {
    down.delete(e.code);
    down.delete(e.key);
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  return {
    getX: () => (down.has('ArrowRight') || down.has('d') ? 1 : down.has('ArrowLeft') || down.has('a') ? -1 : 0),
    getY: () => (down.has('ArrowDown') || down.has('s') ? 1 : down.has('ArrowUp') || down.has('w') ? -1 : 0),
    held: keyFor,
    pressed: keyFor,
    dispose: () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
  };
}
