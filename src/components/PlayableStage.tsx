import { useEffect, useRef } from 'react';
import { Game } from '@beatstreets/engine';
import { loadGameSpec } from '../game/data';
import { CanvasRender } from '../game/render/canvas-render';

export interface PlayableStageProps {
  /** The (1-based) stage to start on. */
  stage?: number;
  width?: number;
  height?: number;
  debug?: boolean;
}

/**
 * Renders a live, drivable {@link Game} scene onto a canvas. This is the bridge
 * between the pure engine and the React shell: the engine advances via
 * requestAnimationFrame, the render layer draws it, and keyboard input drives the
 * player. Demonstrates the whole stack working end-to-end.
 *
 * The game instance lives in a ref and is only read inside effects / the animation
 * loop (never during render), which is why no React state is needed.
 */
export function PlayableStage({ stage = 1, width = 800, height = 480, debug = false }: PlayableStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  // Create the game + attach keyboard listeners once, off-render.
  useEffect(() => {
    const spec = loadGameSpec();
    const controls = makeKeyboardControls();
    const g = new Game(spec, controls);
    g.jumpToStage(stage);
    gameRef.current = g;
    return () => {
      controls.dispose();
      gameRef.current = null;
    };
  }, [stage]);

  // Run the engine loop and draw each frame.
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const game = gameRef.current;
      if (!game) return;
      game.update();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const render = new CanvasRender(ctx, width, height);
        render.clear('#0d0d0d');
        const objs = [game.player, ...game.enemies].sort((a, b) => a.vpos.y - b.vpos.y);
        for (const o of objs) {
          render.blitSprite(o.determineSprite(), o.vpos.x - game.scrollOffset.x, o.vpos.y);
          if (debug) render.drawCircle(o.vpos.x - game.scrollOffset.x, o.vpos.y, 5, '#ff0');
        }
        render.drawText(`Stage ${game.stageIndex + 1} · HP ${game.player.health} · score ${game.score}`, 8, height - 20, false, '#9ad0ff');
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [width, height, debug]);

  return <canvas ref={canvasRef} aria-label={`playable stage ${stage}`} />;
}

interface DisposableControls {
  getX(): number;
  getY(): number;
  held(button: number): boolean;
  pressed(button: number): boolean;
  dispose(): void;
}

/** A keyboard controller mapping arrow keys + WASD to movement, buttons to actions. */
function makeKeyboardControls(): DisposableControls {
  const down = new Set<string>();
  const map: Record<number, string[]> = {
    0: [' '],
    1: ['x'],
    2: ['c'],
    3: ['a'],
  };
  const keyFor = (b: number) => [...down].some((k) => map[b]?.includes(k));
  const onDown = (e: KeyboardEvent) => down.add(e.key.toLowerCase());
  const onUp = (e: KeyboardEvent) => down.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  return {
    getX: () =>
      down.has('arrowright') || down.has('d') ? 1 : down.has('arrowleft') || down.has('a') ? -1 : 0,
    getY: () =>
      down.has('arrowdown') || down.has('s') ? 1 : down.has('arrowup') || down.has('w') ? -1 : 0,
    held: keyFor,
    pressed: keyFor,
    dispose: () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
  };
}
